"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";
import { RETURN_REASONS } from "@/lib/status";

function refresh() {
  revalidatePath("/admin/tilbage");
  revalidatePath("/admin");
  revalidatePath("/tavle");
}

// Ret aarsagen paa en haendelse (bruges til aarsags-statistik)
export async function updateReturnReason(formData) {
  const id = formData.get("id");
  const reason = formData.get("reason");
  if (!id) return;
  await db()
    .from("returns")
    .update({ reason: RETURN_REASONS.includes(reason) ? reason : "Andet" })
    .eq("id", id);
  await bumpDataVersion();
  refresh();
}

// Slet en FEJLREGISTRERET haendelse - statistikken genberegnes automatisk
export async function deleteReturn(formData) {
  const id = formData.get("id");
  if (!id) return;
  await db().from("returns").delete().eq("id", id);
  await bumpDataVersion();
  refresh();
}
