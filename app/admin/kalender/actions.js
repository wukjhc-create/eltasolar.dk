"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";
import { reconcileReturn } from "@/lib/returns";
import { fagOf } from "@/lib/stats";
import { STATUSES } from "@/lib/status";

async function refresh() {
  await bumpDataVersion();
  revalidatePath("/admin/kalender");
  revalidatePath("/admin");
  revalidatePath("/tavle");
}

// Laeser felter fra formularen og slaar medarbejderens hold op,
// saa opgaven altid taeller paa det rigtige hold i Top 3.
async function taskFields(formData) {
  const client = db();
  const employeeId = formData.get("employee_id") || null;
  let teamId = null;
  if (employeeId) {
    const { data } = await client
      .from("employees")
      .select("team_id")
      .eq("id", employeeId)
      .single();
    teamId = data?.team_id || null;
  }
  const status = formData.get("status");
  const fields = {
    date: formData.get("date"),
    employee_id: employeeId,
    team_id: teamId,
    order_number: (formData.get("order_number") || "").trim() || null,
    title: (formData.get("title") || "").trim() || null,
    customer_address: (formData.get("customer_address") || "").trim() || null,
    status: STATUSES[status] ? status : "planlagt",
    return_reason: status === "tilbage" ? formData.get("return_reason") || "Andet" : undefined,
    note: (formData.get("note") || "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  for (const k of Object.keys(fields)) if (fields[k] === undefined) delete fields[k];
  return fields;
}

export async function createTask(formData) {
  const fields = await taskFields(formData);
  const { error } = await db().from("tasks").insert(fields);
  if (error) throw new Error(error.message);
  await refresh();
  redirect(`/admin/kalender?uge=${formData.get("uge") || fields.date}`);
}

export async function updateTask(formData) {
  const id = formData.get("id");
  const fields = await taskFields(formData);
  const client = db();
  const { error } = await client.from("tasks").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  // Status og tilbage-aarsag gaelder sagen - men kun for SAMME fag
  if (fields.order_number) {
    const { data: emp } = await client
      .from("employees").select("id,role").eq("id", fields.employee_id).single();
    const fag = fagOf(emp);
    const { data: fagEmps } = await client
      .from("employees")
      .select("id")
      [fag === "el" ? "eq" : "neq"]("role", "Elektriker");
    await client
      .from("tasks")
      .update({
        status: fields.status,
        ...(fields.return_reason !== undefined ? { return_reason: fields.return_reason } : {}),
        updated_at: fields.updated_at,
      })
      .eq("order_number", fields.order_number)
      .in("employee_id", (fagEmps || []).map((e) => e.id));
    await reconcileReturn(client, fields.order_number, fields.title, fields.status, fields.return_reason || null, fag);
  }
  await refresh();
  redirect(`/admin/kalender?uge=${formData.get("uge") || fields.date}`);
}

// Hurtigt status-skift direkte fra kalenderen (de fire farveprikker).
// Ved "Tilbage" saettes aarsagen til "Andet" hvis der ikke allerede er en -
// den kan rettes ved at klikke paa opgaven.
export async function setTaskStatus(formData) {
  const id = formData.get("id");
  const status = formData.get("status");
  if (!id || !STATUSES[status]) return;
  const client = db();
  const { data: task } = await client
    .from("tasks")
    .select("order_number,return_reason,employee_id")
    .eq("id", id)
    .single();
  const { data: emp } = task?.employee_id
    ? await client.from("employees").select("id,role").eq("id", task.employee_id).single()
    : { data: null };
  const fag = fagOf(emp);
  // Kun kort paa SAMME fag foelger med (el og montage maales hver for sig)
  const { data: fagEmps } = await client
    .from("employees")
    .select("id")
    [fag === "el" ? "eq" : "neq"]("role", "Elektriker");
  const fagIds = (fagEmps || []).map((e) => e.id);
  const fields = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "tilbage") {
    fields.return_reason = task?.return_reason || "Andet";
  }
  // Et klik gaelder hele SAGEN: alle kort med samme sagsnummer opdateres
  const query = client.from("tasks").update(fields);
  const { error } = task?.order_number
    ? await query.eq("order_number", task.order_number)
    : await query.eq("id", id);
  if (error) throw new Error(error.message);
  await refresh();
}

export async function deleteTask(formData) {
  const id = formData.get("id");
  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await refresh();
  redirect(`/admin/kalender?uge=${formData.get("uge") || ""}`);
}
