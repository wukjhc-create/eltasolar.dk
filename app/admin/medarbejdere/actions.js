"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";
import { ROLES } from "@/lib/status";

async function refresh() {
  await bumpDataVersion();
  revalidatePath("/admin/medarbejdere");
  revalidatePath("/admin/kalender");
  revalidatePath("/tavle");
}

function employeeFields(formData) {
  const role = formData.get("role");
  return {
    name: (formData.get("name") || "").trim(),
    role: ROLES.includes(role) ? role : "Andet",
    team_id: formData.get("team_id") || null,
    active: formData.get("active") === "on",
    show_on_board: formData.get("show_on_board") === "on",
    daily_hours: Number(formData.get("daily_hours") || 7.5),
    sort_order: Number(formData.get("sort_order") || 0),
    updated_at: new Date().toISOString(),
  };
}

export async function createEmployee(formData) {
  const fields = employeeFields(formData);
  if (!fields.name) redirect("/admin/medarbejdere/ny");
  const { error } = await db().from("employees").insert(fields);
  if (error) throw new Error(error.message);
  await refresh();
  redirect("/admin/medarbejdere");
}

export async function updateEmployee(formData) {
  const id = formData.get("id");
  const { error } = await db().from("employees").update(employeeFields(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  await refresh();
  redirect("/admin/medarbejdere");
}

// Hurtig aktiv/inaktiv-knap direkte fra listen
export async function toggleEmployeeActive(formData) {
  const id = formData.get("id");
  const active = formData.get("active") === "true";
  const { error } = await db()
    .from("employees")
    .update({ active: !active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await refresh();
}
