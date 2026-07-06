// Koeres automatisk af Vercel Cron hvert 10. minut (se vercel.json).
// Kan ogsaa kaldes manuelt fra admin-siden.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request) {
  // Hvis CRON_SECRET er sat i Vercel, kraeves den i Authorization-headeren
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const report = await runSync();
  revalidatePath("/tavle");
  revalidatePath("/admin");
  revalidatePath("/admin/kalender");
  revalidatePath("/admin/synk");
  return NextResponse.json(report, { status: report.error ? 500 : 200 });
}
