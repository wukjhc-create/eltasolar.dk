"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";
import { reconcileReturn } from "@/lib/returns";
import { RETURN_REASONS } from "@/lib/status";

async function refresh() {
  await bumpDataVersion();
  revalidatePath("/admin/morgen");
  revalidatePath("/admin/kalender");
  revalidatePath("/admin");
  revalidatePath("/tavle");
}

// Afgoer en hel sag fra morgengennemgangen: Faerdig eller Tilbage (+aarsag)
export async function resolveCase(formData) {
  const orderNumber = formData.get("order_number");
  const decision = formData.get("decision");
  if (!orderNumber || !["lukket", "tilbage"].includes(decision)) return;

  const fields = { status: decision, updated_at: new Date().toISOString() };
  if (decision === "tilbage") {
    const reason = formData.get("return_reason");
    fields.return_reason = RETURN_REASONS.includes(reason) ? reason : "Andet";
  }

  const { error } = await db().from("tasks").update(fields).eq("order_number", orderNumber);
  if (error) throw new Error(error.message);
  await reconcileReturn(null, orderNumber, null, decision, fields.return_reason || null);
  await refresh();
}
