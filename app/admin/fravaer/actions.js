"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";

async function refresh() {
  await bumpDataVersion();
  revalidatePath("/admin/fravaer");
  revalidatePath("/admin");
  revalidatePath("/tavle");
}

// Klik i fravaersgriddet: opret fravaer med medarbejderens standardtimer,
// eller fjern det igen hvis det allerede findes.
export async function toggleAbsence(formData) {
  const employeeId = formData.get("employee_id");
  const date = formData.get("date");
  const client = db();

  const { data: existing } = await client
    .from("absences")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    await client.from("absences").delete().eq("id", existing.id);
  } else {
    const { data: emp } = await client
      .from("employees")
      .select("daily_hours")
      .eq("id", employeeId)
      .single();
    await client.from("absences").insert({
      employee_id: employeeId,
      date,
      hours: Number(emp?.daily_hours || 7.5),
      reason: "Sygdom",
    });
  }
  await refresh();
}

// Manuel registrering med valgfrit timetal og aarsag (overskriver evt. eksisterende)
export async function registerAbsence(formData) {
  const employeeId = formData.get("employee_id");
  const date = formData.get("date");
  const hours = Number(formData.get("hours") || 7.5);
  const reason = (formData.get("reason") || "").trim() || "Fravær";
  if (!employeeId || !date) return;

  await db()
    .from("absences")
    .upsert(
      { employee_id: employeeId, date, hours, reason, updated_at: new Date().toISOString() },
      { onConflict: "employee_id,date" }
    );
  await refresh();
}
