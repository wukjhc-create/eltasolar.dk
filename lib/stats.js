// Beregninger til KPI-er, Top 3 og fravaer.
// Alle funktioner er rene funktioner uden databasekald - lette at teste og aendre.

import { ROLE_GROUP } from "./status";

// Status-rang: bruges naar samme sag har flere kort (hoejeste vinder til visning)
const STATUS_RANK = { planlagt: 0, i_gang: 1, lukket: 2, tilbage: 3 };

// Reducerer kort til UNIKKE SAGER (et sagsnummer = en sag, uanset antal mand og dage).
// was_returned bevares: har sagen VAERET tilbage, taeller den altid som tilbagekoersel.
export function uniqueCases(tasks) {
  const map = new Map();
  for (const t of tasks) {
    const key = t.order_number || `id:${t.id}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...t, was_returned: !!t.was_returned });
    } else {
      if ((STATUS_RANK[t.status] ?? 0) > (STATUS_RANK[existing.status] ?? 0)) {
        map.set(key, { ...t, was_returned: existing.was_returned || !!t.was_returned });
      } else if (t.was_returned) {
        existing.was_returned = true;
      }
    }
  }
  return [...map.values()];
}

// Maal-statistik: andel af sager der har vaeret koert tilbage (uanset nuvaerende status)
export function returnGoalStats(tasks, goalPct = 6) {
  const cases = uniqueCases(tasks);
  const returned = cases.filter((c) => c.was_returned || c.status === "tilbage").length;
  const pct = cases.length ? Math.round((returned / cases.length) * 1000) / 10 : 0;
  return { total: cases.length, returned, pct, goalPct, ok: pct <= goalPct };
}

export function taskCounts(tasks) {
  const counts = { planlagt: 0, i_gang: 0, lukket: 0, tilbage: 0 };
  for (const t of tasks) if (counts[t.status] !== undefined) counts[t.status]++;
  const total = tasks.length;
  // Faerdiggoerelsesprocent: lukkede / alle sager i perioden
  const completion = total ? Math.round((counts.lukket / total) * 100) : 0;
  // Tilbagekoerselsprocent: sager der HAR vaeret tilbage / alle sager
  // (en sag der lukkes efter en tilbagekoersel taeller stadig med)
  const returned = tasks.filter((t) => t.was_returned || t.status === "tilbage").length;
  const returnPct = total ? Math.round((returned / total) * 100) : 0;
  return { counts, total, completion, returnPct };
}

// Kategoriserer et fravaer ud fra aarsagen: sygdom, ferie/fri eller andet
export function classifyAbsence(reason) {
  const r = (reason || "").toLowerCase();
  if (/(syg|sick)/.test(r)) return "syg";
  if (/(ferie|fri|afspads|holiday|vacation|helligdag)/.test(r)) return "ferie";
  return "andet";
}

// Fravaersberegning efter driftslogik:
// - Ferie/fri og andet planlagt fravaer REDUCERER kapaciteten (mulige timer)
// - Sygefravaer maales som sygetimer / NETTO mulige timer (efter ferie-fradrag)
// - Ferie/fri vises som andel af brutto-timerne (informativt, ikke alarm)
export function absencePct(absences, employees, workdays) {
  const boardEmployees = employees.filter((e) => e.active && e.show_on_board);
  const possible =
    boardEmployees.reduce((s, e) => s + Number(e.daily_hours || 7.5), 0) * workdays;

  const cat = { syg: 0, ferie: 0, andet: 0 };
  let hours = 0;
  for (const a of absences) {
    const h = Number(a.hours || 0);
    hours += h;
    cat[classifyAbsence(a.reason)] += h;
  }

  const netPossible = Math.max(possible - cat.ferie - cat.andet, 0);
  const pctOfGross = (h) => (possible ? Math.round((h / possible) * 1000) / 10 : 0);
  const sickPct = netPossible ? Math.round((cat.syg / netPossible) * 1000) / 10 : 0;

  return {
    hours,
    possible,
    netPossible,
    pct: pctOfGross(hours), // samlet fravaer af brutto (informativt)
    syg: { hours: cat.syg, pct: sickPct }, // MAALES AF NETTO
    ferie: { hours: cat.ferie, pct: pctOfGross(cat.ferie) },
    andet: { hours: cat.andet, pct: pctOfGross(cat.andet) },
  };
}

// Top 3 montoerhold ud fra antal sager med status "lukket".
// Returnerer generiske entries: { key, label, color, count }
export function topThreeTeams(tasks, teams) {
  const byTeam = new Map(); // team_id -> Set af sagsnumre
  for (const t of tasks) {
    if (t.status !== "lukket" || !t.team_id) continue;
    if (!byTeam.has(t.team_id)) byTeam.set(t.team_id, new Set());
    byTeam.get(t.team_id).add(t.order_number || `id:${t.id}`);
  }
  return [...byTeam.entries()]
    .map(([teamId, set]) => {
      const team = teams.find((x) => x.id === teamId);
      return team
        ? { key: team.id, label: team.name, color: team.color || "#64748b", count: set.size }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

// Top 3 for en bestemt rolle (fx Elektriker) paa MEDARBEJDER-niveau,
// da elektrikere koerer alene.
export function topThreeByRole(tasks, employees, role, color = "#eab308") {
  const roleIds = new Set(employees.filter((e) => e.role === role).map((e) => e.id));
  const byEmp = new Map(); // employee_id -> Set af sagsnumre
  for (const t of tasks) {
    if (t.status !== "lukket" || !roleIds.has(t.employee_id)) continue;
    if (!byEmp.has(t.employee_id)) byEmp.set(t.employee_id, new Set());
    byEmp.get(t.employee_id).add(t.order_number || `id:${t.id}`);
  }
  return [...byEmp.entries()]
    .map(([empId, set]) => {
      const emp = employees.find((e) => e.id === empId);
      return emp ? { key: emp.id, label: emp.name, color, count: set.size } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

// Grupperer medarbejdere (aktive + vis paa tavle) efter hold.
// Medarbejdere UDEN hold grupperes efter deres rolle (fx "Elektrikere")
// i stedet for en anonym "Uden hold"-gruppe.
export function groupForBoard(employees, teams) {
  const visible = employees.filter((e) => e.active && e.show_on_board);
  const activeTeams = teams.filter((t) => t.active);
  const groups = activeTeams
    .map((team) => ({ team, employees: visible.filter((e) => e.team_id === team.id) }))
    .filter((g) => g.employees.length > 0);

  const noTeam = visible.filter(
    (e) => !e.team_id || !activeTeams.some((t) => t.id === e.team_id)
  );
  const byRole = {};
  for (const e of noTeam) (byRole[e.role] ||= []).push(e);
  for (const [role, emps] of Object.entries(byRole)) {
    const cfg = ROLE_GROUP[role] || { name: role, color: "#94a3b8" };
    groups.push({
      team: { id: "rolle-" + role, name: cfg.name, color: cfg.color },
      employees: emps,
    });
  }
  return groups;
}
