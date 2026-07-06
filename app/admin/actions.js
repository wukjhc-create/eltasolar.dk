"use server";

import { revalidatePath } from "next/cache";
import { setGoals } from "@/lib/goals";
import { bumpDataVersion } from "@/lib/version";

export async function saveGoals(formData) {
  const returnPct = parseFloat(String(formData.get("return_pct")).replace(",", "."));
  const sickPct = parseFloat(String(formData.get("sick_pct")).replace(",", "."));
  await setGoals(returnPct, sickPct);
  await bumpDataVersion();
  revalidatePath("/admin");
  revalidatePath("/tavle");
}
