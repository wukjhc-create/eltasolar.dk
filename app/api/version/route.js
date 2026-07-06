import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data } = await db()
    .from("settings")
    .select("value")
    .eq("key", "data_version")
    .maybeSingle();
  return NextResponse.json({ v: data?.value || "0" });
}
