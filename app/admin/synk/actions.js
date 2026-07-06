"use server";

import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";

export async function runSyncNow() {
  await runSync();
  revalidatePath("/admin/synk");
  revalidatePath("/admin/kalender");
  revalidatePath("/admin");
  revalidatePath("/tavle");
}
