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

function currentMonthKey() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" }).slice(0, 7); // YYYY-MM
}

// Omsaetning: maal for maaneden + indtastet omsaetning indtil nu.
// Skifter maaneden, nulstilles "indtil nu" automatisk (maalet bevares).
export async function getRevenue() {
  const { data } = await db()
    .from("settings")
    .select("key,value")
    .in("key", ["revenue_goal", "revenue_current", "revenue_month"]);
  const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  const goal = parseFloat(map.revenue_goal) || 0;
  const sameMonth = map.revenue_month === currentMonthKey();
  const current = sameMonth ? parseFloat(map.revenue_current) || 0 : 0;
  return { goal, current };
}

export async function setRevenue(goal, current) {
  const rows = [{ key: "revenue_month", value: currentMonthKey() }];
  if (Number.isFinite(goal)) rows.push({ key: "revenue_goal", value: String(goal) });
  if (Number.isFinite(current)) rows.push({ key: "revenue_current", value: String(current) });
  await db().from("settings").upsert(rows, { onConflict: "key" });
}

export async function setGoals(returnPct, sickPct) {
  const client = db();
  const rows = [];
  if (Number.isFinite(returnPct)) rows.push({ key: "goal_return_pct", value: String(returnPct) });
  if (Number.isFinite(sickPct)) rows.push({ key: "goal_sick_pct", value: String(sickPct) });
  if (rows.length) await client.from("settings").upsert(rows, { onConflict: "key" });
}

// Bilnavne fra OS Vehicle (en pr. linje) - bruges af Flaadens pr.-bil-opslag,
// fordi API-ets cars-liste pt. kommer tom retur.
export async function getFleetCarNames() {
  const { data } = await db().from("settings").select("value").eq("key", "fleet_cars").maybeSingle();
  return String(data?.value || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveFleetCarNames(text) {
  await db()
    .from("settings")
    .upsert([{ key: "fleet_cars", value: String(text || "") }], { onConflict: "key" });
}
