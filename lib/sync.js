// Synkronisering fra Ordrestyring til tavlen.
//
// Principper:
// - Ordrestyring bestemmer HVEM (medarbejdere) og HVAD/HVORNAAR (planlagte sager).
// - Tavlen bestemmer HOLD og STATUS - status roeres ALDRIG af synkroniseringen.
// - En sag vises kun EN gang pr. medarbejder pr. dag, selv om Ordrestyring
//   har flere kalenderblokke (formiddag/eftermiddag) paa samme sag.
// - Alt skrives i batches, saa selv store kalendere synkroniseres paa faa sekunder.

import { db } from "./db";
import { reconcileReturn } from "./returns";
import { bumpDataVersion } from "./version";
import { fetchOsUsers, fetchOsEvents, mapCase, osTimeToDateISO } from "./ordrestyring";
import { getMonday, addDays, toISODate } from "./dates";
import { fagOf } from "./stats";

// Ordrestyrings sagsstatus kan styre tavlen:
// "klar til fakturering" mv. -> Lukket, "genbesoeg" -> Tilbage (taeller i statistik)
// Ordrestyring er den eneste sandhed - men sagen har TO fag (EL og montage),
// og hvert korts status afgoeres af medarbejderens fag + sagens status:
//   "El faerdig"                 -> el = lukket   (montage uaendret)
//   "Solceller faerdig"          -> montage = lukket (el uaendret)
//   "Kraever genbesoeg EL"       -> el = tilbage
//   "Kraever genbesoeg Solceller"-> montage = tilbage
//   "Klar til tilmelding" /
//   "Klar til fakturering" m.fl. -> BEGGE fag = lukket
//   Alt andet (Aaben osv.)       -> planlagt
// (\bel\b matcher ikke "el" inde i "solceller")
function isDoneAll(t) {
  return /(klar til tilmelding|klar til faktur|faktureret|afsluttet)/.test(t);
}
function mapFagStatus(text, fag) {
  const t = (text || "").toLowerCase();
  if (isDoneAll(t)) return "lukket";
  if (fag === "el") {
    if (/genbes.*\bel\b/.test(t)) return "tilbage";
    if (/\bel\b\s*f(æ|ae)rdig/.test(t)) return "lukket";
  } else {
    if (/genbes.*solcell/.test(t)) return "tilbage";
    if (/solcell.*f(æ|ae)rdig/.test(t) || /montage.*f(æ|ae)rdig/.test(t)) return "lukket";
  }
  if (/(i gang|igangsat|startet|p(å|aa)begyndt)/.test(t)) return "i_gang";
  return "planlagt";
}

const ABSENCE_WORDS = ["ferie", "syg", "sygdom", "sygemeldt", "fri", "barsel", "afspads", "orlov", "helligdag", "sick", "holiday", "vacation", "absence", "kursus", "skole"];

function guessRole(employeeType) {
  const t = (employeeType || "").toLowerCase();
  if (t.includes("elek")) return "Elektriker";
  if (t.includes("lærling") || t.includes("laerling")) return "Lærling";
  if (t.includes("kontor") || t.includes("admin")) return "Kontor";
  return "Montør";
}

function guessDailyHours(workHours) {
  if (typeof workHours !== "number" || !workHours) return 7.5;
  if (workHours > 20 && workHours <= 60) return Math.round((workHours / 5) * 2) / 2;
  if (workHours >= 4 && workHours <= 12) return workHours;
  return 7.5;
}

// Alle hverdage (man-fre) et event spaender over, max 14
function eventDates(startTime, stopTime) {
  const startISO = osTimeToDateISO(startTime);
  if (!startISO) return [];
  const stopISO = osTimeToDateISO(stopTime) || startISO;
  const dates = [];
  let d = new Date(`${startISO}T12:00:00`);
  const stop = new Date(`${stopISO}T12:00:00`);
  let guard = 0;
  while (d <= stop && guard < 14) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) dates.push(toISODate(d));
    d = addDays(d, 1);
    guard++;
  }
  return dates.length ? dates : [startISO];
}

async function saveReport(client, report) {
  report.finishedAt = new Date().toISOString();
  const changed =
    report.error ||
    report.employees.created + report.employees.updated + report.employees.deactivated > 0 ||
    report.tasks.created + report.tasks.updated + report.tasks.deleted > 0 ||
    report.absences.created > 0 ||
    (report.returns || 0) > 0;
  if (changed) await bumpDataVersion(client);
  await client.from("settings").upsert(
    { key: "last_sync_report", value: JSON.stringify(report) },
    { onConflict: "key" }
  );
}

async function insertInChunks(client, table, rows, report, label) {
  let created = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await client.from(table).insert(chunk);
    if (!error) {
      created += chunk.length;
      continue;
    }
    // En raekke i bundtet fejlede: proev dem enkeltvis, saa resten kommer ind
    for (const row of chunk) {
      const { error: rowError } = await client.from(table).insert(row);
      if (rowError) report.warnings.push(`${label}: ${rowError.message}`);
      else created++;
    }
  }
  return created;
}

export async function runSync() {
  const client = db();
  const report = {
    startedAt: new Date().toISOString(),
    employees: { created: 0, updated: 0, deactivated: 0 },
    tasks: { created: 0, updated: 0, deleted: 0, merged: 0, skipped: 0 },
    absences: { created: 0 },
    warnings: [],
    error: null,
  };
  try {
    return await runSyncInner(client, report);
  } catch (err) {
    report.error = `Uventet fejl under synkronisering: ${err.message}`;
    await saveReport(client, report);
    return report;
  }
}

async function runSyncInner(client, report) {
  /* ---------- 1) Medarbejdere ---------- */
  const usersResult = await fetchOsUsers();
  if (usersResult.error) {
    report.error = usersResult.error;
    await saveReport(client, report);
    return report;
  }

  const { data: existingEmployees } = await client.from("employees").select("*");
  const employees = existingEmployees || [];
  const byOsId = new Map(
    employees.filter((e) => e.os_user_id != null).map((e) => [e.os_user_id, e])
  );
  const byName = new Map(employees.map((e) => [e.name.trim().toLowerCase(), e]));

  for (const u of usersResult.users) {
    if (!u.name) continue;
    let emp = byOsId.get(u.id);

    if (!emp) {
      const nameMatch = byName.get(u.name.toLowerCase());
      if (nameMatch && nameMatch.os_user_id == null) emp = nameMatch;
    }

    if (emp) {
      const changes = {};
      if (emp.os_user_id !== u.id) changes.os_user_id = u.id;
      if (emp.name !== u.name) changes.name = u.name;
      if (!u.active && emp.active) {
        changes.active = false;
        report.employees.deactivated++;
      }
      if (Object.keys(changes).length) {
        changes.updated_at = new Date().toISOString();
        const { error } = await client.from("employees").update(changes).eq("id", emp.id);
        if (error) report.warnings.push(`Medarbejder ${u.name}: ${error.message}`);
        else report.employees.updated++;
        Object.assign(emp, changes);
      }
      byOsId.set(u.id, emp);
    } else if (u.active) {
      const { data: created, error } = await client
        .from("employees")
        .insert({
          name: u.name,
          role: guessRole(u.employeeType),
          os_user_id: u.id,
          active: true,
          show_on_board: true,
          daily_hours: guessDailyHours(u.workHours),
          sort_order: 999,
        })
        .select()
        .single();
      if (error) report.warnings.push(`Kunne ikke oprette ${u.name}: ${error.message}`);
      else {
        report.employees.created++;
        byOsId.set(u.id, created);
      }
    }
  }

  /* ---------- 2) Kalender-events ---------- */
  const monday = getMonday(new Date());
  const fromISO = toISODate(addDays(monday, -7));
  const toISO = toISODate(addDays(monday, 33));

  const eventsResult = await fetchOsEvents(fromISO, toISO);
  if (eventsResult.error) {
    report.error = eventsResult.error;
    await saveReport(client, report);
    return report;
  }

  // Hent eksisterende fravaer i intervallet: MANUELT registreret fravaer
  // (uden os_identifier) maa aldrig overskrives af synkroniseringen
  const { data: existingAbsences } = await client
    .from("absences")
    .select("employee_id,date,os_identifier")
    .gte("date", fromISO)
    .lte("date", toISO);
  const manualAbsence = new Set(
    (existingAbsences || [])
      .filter((a) => !a.os_identifier)
      .map((a) => `${a.employee_id}|${a.date}`)
  );

  // Hent ALLE eksisterende synkroniserede opgaver i intervallet EN gang
  const { data: syncedTasks } = await client
    .from("tasks")
    .select("id,os_identifier,employee_id,date,order_number,team_id,title,customer_address,status,return_reason")
    .not("os_identifier", "is", null)
    .gte("date", fromISO)
    .lte("date", toISO);

  const byIdentifier = new Map((syncedTasks || []).map((t) => [t.os_identifier, t]));
  const contentKey = (t) => `${t.employee_id}|${t.date}|${t.order_number || ""}`;
  const byContent = new Map();
  for (const t of syncedTasks || []) {
    if (!byContent.has(contentKey(t))) byContent.set(contentKey(t), t);
  }

  const seenIdentifiers = new Set();
  const seenContent = new Set();
  const caseStatusSeen = new Map();
  const taskInserts = [];
  const absenceRows = new Map(); // key: employee|date

  for (const ev of eventsResult.events) {
    const emp = ev.user ? byOsId.get(ev.user.id) : null;
    const baseId = String(ev.identifier || `event-${ev.id}`);
    const dates = eventDates(ev.startTime, ev.stopTime);

    if (!emp) {
      report.tasks.skipped++;
      continue;
    }

    // Uden sag: muligvis fravaer
    if (!ev.case) {
      const headerText = `${ev.header || ""} ${ev.text || ""} ${ev.type || ""} ${ev.hourType?.name || ""}`.toLowerCase();
      if (ABSENCE_WORDS.some((w) => headerText.includes(w))) {
        for (const dateISO of dates) {
          if (manualAbsence.has(`${emp.id}|${dateISO}`)) continue; // manuelt vinder
          absenceRows.set(`${emp.id}|${dateISO}`, {
            employee_id: emp.id,
            date: dateISO,
            hours: Number(emp.daily_hours || 7.5),
            reason: (ev.hourType?.name || ev.header || ev.text || "Fravær").slice(0, 80),
            os_identifier: `${baseId}#${dateISO}`,
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        report.tasks.skipped++;
      }
      continue;
    }

    // Med sag: en opgave pr. medarbejder pr. dag (flere kalenderblokke = en opgave)
    const mapped = mapCase(ev.case);
    if (mapped.caseNumber) {
      const info = caseStatusSeen.get(mapped.caseNumber) || { title: mapped.title, fags: new Set() };
      info.osStatus = mapped.osStatus;
      info.fags.add(fagOf(emp));
      caseStatusSeen.set(mapped.caseNumber, info);
    }
    const cardFag = fagOf(emp);
    for (const dateISO of dates) {
      const key = `${emp.id}|${dateISO}|${mapped.caseNumber || ""}`;
      if (seenContent.has(key)) {
        report.tasks.merged++;
        continue;
      }
      seenContent.add(key);

      const identifier = `${baseId}#${dateISO}`;
      const fields = {
        date: dateISO,
        employee_id: emp.id,
        team_id: emp.team_id || null,
        order_number: mapped.caseNumber || null,
        title: mapped.title || (ev.header || "").slice(0, 100) || null,
        customer_address: mapped.customerAddress || null,
      };

      const existing = byIdentifier.get(identifier) || byContent.get(key);
      if (existing) {
        seenIdentifiers.add(existing.os_identifier);
        const osStatus = mapFagStatus(mapped.osStatus, cardFag);
        const statusChange = existing.status !== osStatus;
        const changed =
          statusChange ||
          existing.date !== fields.date ||
          existing.employee_id !== fields.employee_id ||
          existing.team_id !== fields.team_id ||
          existing.order_number !== fields.order_number ||
          existing.title !== fields.title ||
          existing.customer_address !== fields.customer_address;
        if (changed) {
          const update = { ...fields, updated_at: new Date().toISOString() };
          if (statusChange) {
            update.status = osStatus;
            update.return_reason =
              osStatus === "tilbage" ? existing.return_reason || "Andet" : null;
          }
          const { error } = await client.from("tasks").update(update).eq("id", existing.id);
          if (error) report.warnings.push(`Sag ${mapped.caseNumber}: ${error.message}`);
          else report.tasks.updated++;
        }
      } else {
        seenIdentifiers.add(identifier);
        const osStatus = mapFagStatus(mapped.osStatus, cardFag);
        taskInserts.push({
          ...fields,
          os_identifier: identifier,
          status: osStatus,
          was_returned: false,
          return_reason: osStatus === "tilbage" ? "Andet" : null,
        });
      }
    }
  }

  // Afstem tilbagekoerselslogbogen: en haendelse pr. sag pr. genbesoegsforloeb.
  // Genplanlaegning aendrer intet; lukning modregner ALDRIG; kun nye genbesoeg
  // giver nye haendelser. (caseStatusSeen: sagsnummer -> {status, title})
  for (const [orderNumber, info] of caseStatusSeen) {
    for (const fag of info.fags) {
      const fagStatus = mapFagStatus(info.osStatus, fag);
      const reason = fag === "el" ? "Elektriker" : "Montage";
      const result = await reconcileReturn(client, orderNumber, info.title, fagStatus, reason, fag);
      if (result.created) report.returns = (report.returns || 0) + 1;
    }
  }

  // Batch: nye opgaver
  report.tasks.created = await insertInChunks(client, "tasks", taskInserts, report, "Nye opgaver");

  // Batch: fravaer (en raekke pr. medarbejder pr. dag)
  const absenceList = [...absenceRows.values()];
  for (let i = 0; i < absenceList.length; i += 100) {
    const chunk = absenceList.slice(i, i + 100);
    const { error } = await client
      .from("absences")
      .upsert(chunk, { onConflict: "employee_id,date" });
    if (error) report.warnings.push(`Fravær: ${error.message}`);
    else report.absences.created += chunk.length;
  }

  /* ---------- 3) Ryd op: fuld spejling af Ordrestyrings kalender ---------- */
  // Ordrestyring er den eneste sandhed: synkroniserede kort, der ikke laengere
  // findes i Ordrestyrings kalender (flyttet, slettet eller dublet), fjernes -
  // uanset status. Flyttes en aftale, foelger kortet med til den nye dag.
  const deleteIds = (syncedTasks || [])
    .filter((t) => !seenIdentifiers.has(t.os_identifier))
    .map((t) => t.id);
  for (let i = 0; i < deleteIds.length; i += 100) {
    const chunk = deleteIds.slice(i, i + 100);
    const { error } = await client.from("tasks").delete().in("id", chunk);
    if (!error) report.tasks.deleted += chunk.length;
  }

  /* ---------- 4) Gem rapport ---------- */
  await saveReport(client, report);
  return report;
}

export async function getLastSyncReport() {
  const { data } = await db()
    .from("settings")
    .select("value")
    .eq("key", "last_sync_report")
    .maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return null;
  }
}
