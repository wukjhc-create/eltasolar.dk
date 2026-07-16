import { db } from "@/lib/db";
import SlideForm from "@/components/SlideForm";
import {
  opretSlide, opdaterSlide, sletSlide, toggleSlide, flytSlide, gemSlideIndstillinger,
} from "./actions";

export const dynamic = "force-dynamic";

async function getSettings() {
  const { data } = await db().from("settings").select("key,value").in("key", ["slides_default_duration", "slides_paused"]);
  const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  return {
    defaultDuration: parseInt(map.slides_default_duration, 10) || 15,
    paused: map.slides_paused === "1",
  };
}

export default async function StandardPage({ searchParams }) {
  const editId = parseInt(searchParams?.id, 10) || null;
  const [{ data: slides }, settings] = await Promise.all([
    db().from("info_slides").select("*").order("sort_order"),
    getSettings(),
  ]);
  const editSlide = editId ? (slides || []).find((s) => s.id === editId) : null;

  return (
    <main>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">ELTA Standard</h1>
        <span className="text-xs text-slate-400">Diasshow på tavlen · kun aktive slides vises</span>
      </div>
      <p className="mb-5 max-w-3xl text-sm text-slate-500">
        Korte informations- og motivationsslides til informationstavlen. Ændringer slår igennem på
        skærmen af sig selv inden for et minut.
      </p>

      <div className="grid max-w-6xl grid-cols-[1fr_24rem] items-start gap-5">
        <div>
          <form action={gemSlideIndstillinger} className="card mb-4 flex flex-wrap items-end gap-4 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Standard visningstid (sekunder)
              </label>
              <input
                name="default_duration" type="number" min={3} max={120}
                defaultValue={settings.defaultDuration}
                className="w-32 rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input type="checkbox" name="paused" defaultChecked={settings.paused} />
              Sæt diasshowet på pause
            </label>
            <button type="submit" className="btn-primary">Gem indstillinger</button>
          </form>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Slides ({(slides || []).length})
            </div>
            <ul>
              {(slides || []).map((s, i) => (
                <li key={s.id} className={`border-b border-slate-100 px-4 py-3 last:border-0 ${s.is_active ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.icon || "📄"}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{s.title}</span>
                    {s.priority === 2 && (
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">VIGTIG</span>
                    )}
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{s.category}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{s.display_duration || settings.defaultDuration} sek.</span>
                    {s.weekdays && <span>· dage {s.weekdays}</span>}
                    {(s.start_date || s.end_date) && <span>· {s.start_date || "…"} → {s.end_date || "…"}</span>}
                    <span className="flex-1" />
                    <form action={flytSlide}>
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="op" />
                      <button className="btn-ghost px-2" disabled={i === 0}>↑</button>
                    </form>
                    <form action={flytSlide}>
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="ned" />
                      <button className="btn-ghost px-2" disabled={i === (slides || []).length - 1}>↓</button>
                    </form>
                    <form action={toggleSlide}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={s.is_active ? "0" : "1"} />
                      <button className="btn-ghost">{s.is_active ? "Deaktivér" : "Aktivér"}</button>
                    </form>
                    <a href={`/admin/standard?id=${s.id}`} className="btn-ghost">Rediger</a>
                    <form action={sletSlide}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn-ghost text-red-600">Slet</button>
                    </form>
                  </div>
                </li>
              ))}
              {(slides || []).length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">
                  Ingen slides endnu – opret det første i formularen til højre (husk at køre migration-v62.sql først).
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {editSlide ? `Rediger: ${editSlide.title}` : "Nyt slide"}
          </div>
          {editSlide && (
            <a href="/admin/standard" className="mb-2 inline-block text-xs text-blue-600 underline">
              ← Tilbage til nyt slide
            </a>
          )}
          <SlideForm
            action={editSlide ? opdaterSlide : opretSlide}
            slide={editSlide}
            submitLabel={editSlide ? "Gem ændringer" : "Opret slide"}
          />
        </div>
      </div>
    </main>
  );
}
