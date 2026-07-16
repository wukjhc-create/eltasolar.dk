"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bumpDataVersion } from "@/lib/version";

async function refresh() {
  revalidatePath("/admin/standard");
  revalidatePath("/tavle");
  await bumpDataVersion();
}

const CATEGORIES = [
  "Ejerskab", "Solcellemontage", "Elektriker", "Kvalitet", "Dokumentation",
  "Kundeservice", "Sikkerhed", "Effektivitet", "Oprydning", "Holdånd",
  "ELTA Academy", "Generel information",
];
const BACKGROUNDS = ["solskin", "blaek", "solgul", "groen", "gradient_sol", "gradient_blaek", "billede"];

function slideFields(formData) {
  const t = (k, max = 300) => (formData.get(k) || "").toString().trim().slice(0, max) || null;
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => formData.get(`day_${d}`) === "on");
  const duration = parseInt(formData.get("display_duration"), 10);
  return {
    title: t("title", 120) || "Uden titel",
    subtitle: t("subtitle", 200),
    body: t("body", 600),
    bullet_points: t("bullet_points", 1500),
    footer_text: t("footer_text", 250),
    category: CATEGORIES.includes(formData.get("category")) ? formData.get("category") : "Generel information",
    image_url: t("image_url", 500),
    icon: t("icon", 20),
    background_type: BACKGROUNDS.includes(formData.get("background_type")) ? formData.get("background_type") : "solskin",
    background_image_url: t("background_image_url", 500),
    text_color: formData.get("text_color") === "lys" ? "lys" : "moerk",
    text_alignment: formData.get("text_alignment") === "center" ? "center" : "venstre",
    display_duration: Number.isFinite(duration) && duration >= 3 && duration <= 120 ? duration : null,
    priority: formData.get("priority") === "2" ? 2 : 1,
    start_date: t("start_date", 10),
    end_date: t("end_date", 10),
    weekdays: days.length > 0 && days.length < 7 ? days.join(",") : null,
    updated_at: new Date().toISOString(),
  };
}

export async function opretSlide(formData) {
  const client = db();
  const { data: last } = await client
    .from("info_slides").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const fields = slideFields(formData);
  fields.sort_order = (last?.sort_order || 0) + 1;
  const { error } = await client.from("info_slides").insert(fields);
  if (error) throw new Error(error.message);
  await refresh();
}

export async function opdaterSlide(formData) {
  const id = parseInt(formData.get("id"), 10);
  if (!id) return;
  const { error } = await db().from("info_slides").update(slideFields(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  await refresh();
}

export async function sletSlide(formData) {
  const id = parseInt(formData.get("id"), 10);
  if (!id) return;
  await db().from("info_slides").delete().eq("id", id);
  await refresh();
}

export async function toggleSlide(formData) {
  const id = parseInt(formData.get("id"), 10);
  const active = formData.get("active") === "1";
  if (!id) return;
  await db().from("info_slides").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  await refresh();
}

export async function flytSlide(formData) {
  const id = parseInt(formData.get("id"), 10);
  const dir = formData.get("dir") === "op" ? -1 : 1;
  if (!id) return;
  const client = db();
  const { data: all } = await client.from("info_slides").select("id,sort_order").order("sort_order");
  const idx = (all || []).findIndex((s) => s.id === id);
  const other = all?.[idx + dir];
  if (idx < 0 || !other) return;
  await client.from("info_slides").update({ sort_order: other.sort_order }).eq("id", id);
  await client.from("info_slides").update({ sort_order: all[idx].sort_order }).eq("id", other.id);
  await refresh();
}

export async function gemSlideIndstillinger(formData) {
  const dur = parseInt(formData.get("default_duration"), 10);
  const rows = [
    { key: "slides_default_duration", value: String(Number.isFinite(dur) && dur >= 3 && dur <= 120 ? dur : 15) },
    { key: "slides_paused", value: formData.get("paused") === "on" ? "1" : "0" },
  ];
  await db().from("settings").upsert(rows, { onConflict: "key" });
  await refresh();
}
