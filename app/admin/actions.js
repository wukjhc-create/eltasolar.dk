"use server";

import { revalidatePath } from "next/cache";
import { setGoals, setRevenue } from "@/lib/goals";
import { bumpDataVersion } from "@/lib/version";

export async function saveRevenue(formData) {
  const parse = (v) => parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  const goal = parse(formData.get("revenue_goal"));
  const current = parse(formData.get("revenue_current"));
  await setRevenue(goal, current);
  await bumpDataVersion();
  revalidatePath("/admin");
  revalidatePath("/tavle");
}

export async function saveGoals(formData) {
  const returnPct = parseFloat(String(formData.get("return_pct")).replace(",", "."));
  const sickPct = parseFloat(String(formData.get("sick_pct")).replace(",", "."));
  await setGoals(returnPct, sickPct);
  await bumpDataVersion();
  revalidatePath("/admin");
  revalidatePath("/tavle");
}
