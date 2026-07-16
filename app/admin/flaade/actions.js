"use server";

// Beskyttet af middleware (alle /admin-stier kraever login)

import { revalidatePath } from "next/cache";
import { saveFleetCarNames } from "@/lib/goals";

export async function gemBilnavne(formData) {
  await saveFleetCarNames(formData.get("names") || "");
  revalidatePath("/admin/flaade");
  revalidatePath("/tavle");
}
