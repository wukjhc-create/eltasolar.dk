"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";

function refresh() {
  revalidatePath("/admin/nyheder");
  revalidatePath("/tavle");
}

export async function createNews(formData) {
  const message = (formData.get("message") || "").trim().slice(0, 200);
  if (!message) return;

  // Ugedage: gem kun hvis IKKE alle er valgt (tom = alle dage)
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => formData.get(`day_${d}`) === "on");
  const timeOk = (t) => (/^\d{1,2}:\d{2}$/.test(t || "") ? t : null);

  const category = ["breaking", "opslag", "ros"].includes(formData.get("category"))
    ? formData.get("category")
    : "opslag";

  await db().from("news").insert({
    message,
    category,
    breaking: category === "breaking",
    days: days.length > 0 && days.length < 7 ? days.join(",") : null,
    start_time: timeOk(formData.get("start_time")),
    stop_time: timeOk(formData.get("stop_time")),
  });
  await bumpDataVersion();
  refresh();
}

export async function toggleNews(formData) {
  const id = formData.get("id");
  const active = formData.get("active") === "true";
  if (!id) return;
  await db()
    .from("news")
    .update({ active: !active, updated_at: new Date().toISOString() })
    .eq("id", id);
  await bumpDataVersion();
  refresh();
}

export async function deleteNews(formData) {
  const id = formData.get("id");
  if (!id) return;
  await db().from("news").delete().eq("id", id);
  await bumpDataVersion();
  refresh();
}
