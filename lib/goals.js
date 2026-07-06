// Maal for driften: tilbagekoersel og sygefravaer.
// Gemmes i settings-tabellen og kan justeres fra dashboardet.

import { db } from "./db";

const DEFAULTS = { returnPct: 6, sickPct: 3 };

export async function getGoals() {
  const { data } = await db()
    .from("settings")
    .select("key,value")
    .in("key", ["goal_return_pct", "goal_sick_pct"]);
  const map = Object.fromEntries((data || []).map((r) => [r.key, parseFloat(r.value)]));
  return {
    returnPct: Number.isFinite(map.goal_return_pct) ? map.goal_return_pct : DEFAULTS.returnPct,
    sickPct: Number.isFinite(map.goal_sick_pct) ? map.goal_sick_pct : DEFAULTS.sickPct,
  };
}

export async function setGoals(returnPct, sickPct) {
  const client = db();
  const rows = [];
  if (Number.isFinite(returnPct)) rows.push({ key: "goal_return_pct", value: String(returnPct) });
  if (Number.isFinite(sickPct)) rows.push({ key: "goal_sick_pct", value: String(sickPct) });
  if (rows.length) await client.from("settings").upsert(rows, { onConflict: "key" });
}
