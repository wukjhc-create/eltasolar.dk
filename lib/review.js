// Morgengennemgang: finder sager fra tidligere dage, der stadig mangler afklaring.
// En sag er "afventende" hvis dens seneste planlagte dag er passeret,
// den stadig staar som Planlagt eller I gang, og den IKKE er planlagt igen
// i dag eller fremover (saa koerer den jo videre efter planen).

import { db } from "./db";
import { toISODate, addDays, parseISODate } from "./dates";

const RANK = { planlagt: 0, i_gang: 1, lukket: 2, tilbage: 3 };

// Dags dato i dansk tid (serveren koerer i UTC)
function todayCph() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
}

// Seneste arbejdsdag foer i dag (fredag hvis det er mandag)
export function previousWorkday(todayISO) {
  let d = addDays(parseISODate(todayISO), -1);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, -1);
  return toISODate(d);
}

export async function getPendingCases() {
  const client = db();
  const today = todayCph();
  const from = toISODate(addDays(parseISODate(today), -14));

  const [{ data: tasks }, { data: employees }] = await Promise.all([
    client.from("tasks").select("*").gte("date", from).not("order_number", "is", null),
    client.from("employees").select("id,name"),
  ]);

  const nameOf = (id) => {
    const e = (employees || []).find((x) => x.id === id);
    return e ? e.name.split(" ")[0] : null;
  };

  const byCase = new Map();
  for (const t of tasks || []) {
    if (!byCase.has(t.order_number)) byCase.set(t.order_number, []);
    byCase.get(t.order_number).push(t);
  }

  const pending = [];
  for (const [orderNumber, list] of byCase) {
    const rep = list.reduce((a, b) => ((RANK[b.status] ?? 0) > (RANK[a.status] ?? 0) ? b : a));
    if (rep.status !== "planlagt" && rep.status !== "i_gang") continue;
    const lastDate = list.map((t) => t.date).sort().at(-1);
    if (lastDate >= today) continue; // planlagt i dag/fremover -> koerer videre efter planen
    const names = [...new Set(list.map((t) => nameOf(t.employee_id)).filter(Boolean))];
    const synced = list.some((t) => t.os_identifier);
    pending.push({
      synced,
      orderNumber,
      title: rep.title,
      customerAddress: rep.customer_address,
      status: rep.status,
      lastDate,
      names,
    });
  }

  pending.sort((a, b) => (a.lastDate < b.lastDate ? -1 : 1));

  // Morgengennemgangen handler om GAARSDAGENS sager; aeldre gemmes bag et link
  const prevDay = previousWorkday(today);
  return {
    yesterday: pending.filter((c) => c.lastDate === prevDay),
    older: pending.filter((c) => c.lastDate < prevDay),
    prevDay,
  };
}
