// Synkronisering fra Ordrestyring til tavlen.
//
// Principper:
// - Ordrestyring bestemmer HVEM (medarbejdere) og HVAD/HVORNAAR (planlagte sager).
// - Tavlen bestemmer HOLD og STATUS - status roeres ALDRIG af synkroniseringen.
// - En sag vises kun EN gang pr. medarbejder pr. dag, selv om Ordrestyring
//   har flere kalenderblokke (formiddag/eftermiddag) paa samme sag.
// - Alt skrives i batches, saa selv store kalendere synkroniseres paa faa sekunder.

import { db } from "./db";
import { bumpDataVersion } from "./version";
import { fetchOsUsers, fetchOsEvents, mapCase, osTimeToDateISO } from "./ordrestyring";
import { getMonday, addDays, toISODate } from "./dates";

// Ordrestyrings sagsstatus kan styre tavlen:
// "klar til fakturering" mv. -> Lukket, "genbesoeg" -> Tilbage (taeller i statistik)
function mapOsStatus(text) {
  const t = (text || "").toLowerCase();
  if (/(klar til faktur|faktureret|afsluttet|lukket)/.test(t)) return "lukket";
  if (/(genbes|tilbagek)/.test(t)) return "tilbage";
  return null;
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
  await bumpDataVersion(client);
  await client.from("settings").upsert(
    { key: "last_sync_report", value: JSON.stringify(report) },
    { onConflict: "key" }
  );
}

async function insertInChunks(client, table, rows, report, label) {
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await client.from(table).insert(chunk);
    if (error) report.warnings.push(`${label}: ${error.message}`);
  }
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
        const osStatus = mapOsStatus(mapped.osStatus);
        const statusChange = osStatus && existing.status !== osStatus;
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
            if (osStatus === "tilbage") {
              update.was_returned = true;
              update.return_reason = existing.return_reason || "Andet";
            }
          }
          const { error } = await client.from("tasks").update(update).eq("id", existing.id);
          if (error) report.warnings.push(`Sag ${mapped.caseNumber}: ${error.message}`);
          else report.tasks.updated++;
        }
      } else {
        seenIdentifiers.add(identifier);
        const osStatus = mapOsStatus(mapped.osStatus);
        taskInserts.push({
          ...fields,
          os_identifier: identifier,
          status: osStatus || "planlagt",
          ...(osStatus === "tilbage" ? { was_returned: true, return_reason: "Andet" } : {}),
        });
      }
    }
  }

  // Batch: nye opgaver
  await insertInChunks(client, "tasks", taskInserts, report, "Nye opgaver");
  report.tasks.created = taskInserts.length;

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

  /* ---------- 3) Ryd op: dubletter og slettede events ---------- */
  // Synkroniserede "planlagt"-opgaver, der ikke laengere findes i Ordrestyring
  // (herunder gamle dubletter), fjernes. Sager I har roert (i gang/lukket/tilbage) bliver.
  const deleteIds = (syncedTasks || [])
    .filter((t) => !seenIdentifiers.has(t.os_identifier) && t.status === "planlagt")
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
