"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";

async function refresh() {
  await bumpDataVersion();
  revalidatePath("/admin/hold");
  revalidatePath("/admin/kalender");
  revalidatePath("/tavle");
}

function teamFields(formData) {
  return {
    name: (formData.get("name") || "").trim(),
    color: formData.get("color") || "#2563eb",
    active: formData.get("active") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
    updated_at: new Date().toISOString(),
  };
}

export async function createTeam(formData) {
  const fields = teamFields(formData);
  if (!fields.name) redirect("/admin/hold/ny");
  const { error } = await db().from("teams").insert(fields);
  if (error) throw new Error(error.message);
  await refresh();
  redirect("/admin/hold");
}

export async function updateTeam(formData) {
  const id = formData.get("id");
  const { error } = await db().from("teams").update(teamFields(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  await refresh();
  redirect("/admin/hold");
}
