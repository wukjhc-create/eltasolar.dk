import { db } from "@/lib/db";
import { createNews, toggleNews, deleteNews } from "./actions";
import { DAY_LABELS, scheduleLabel, isNewsVisible, NEWS_CATEGORIES } from "@/lib/news";

export const dynamic = "force-dynamic";

export default async function NewsAdmin() {
  const { data: news } = await db()
    .from("news")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">Nyheder</h1>
      <p className="text-sm text-slate-500 mb-5 max-w-2xl">
        Tre kanaler ruller i bunden af tavlen – hver bjælke vises kun, når den har noget i
        luften. Sæt sendedage og tidsrum pr. opslag, fx en morgenbesked 06–09 eller en
        fredagshilsen.
      </p>

      <form action={createNews} className="card p-5 max-w-2xl space-y-3 mb-6">
        <div>
          <label className="label" htmlFor="message">Nyt opslag (max 200 tegn)</label>
          <input id="message" name="message" required maxLength={200} className="input"
            placeholder="fx Fælles morgenmad fredag kl. 7 · Husk billeder på sag 2123" />
        </div>
        <div>
          <span className="label">Sendedage</span>
          <div className="flex flex-wrap gap-3">
            {DAY_LABELS.map((label, i) => (
              <label key={label} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input type="checkbox" name={`day_${i + 1}`} defaultChecked className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="label" htmlFor="start_time">Fra kl. (tom = midnat)</label>
            <input id="start_time" name="start_time" type="time" className="input w-32" />
          </div>
          <div>
            <label className="label" htmlFor="stop_time">Til kl. (tom = midnat)</label>
            <input id="stop_time" name="stop_time" type="time" className="input w-32" />
          </div>
          <p className="pb-2 text-xs text-slate-400">
            fx 06:00–09:00 for en morgenbesked · 22:00–06:00 virker også (over midnat)
          </p>
        </div>
        <div>
          <span className="label">Kanal</span>
          <div className="flex flex-wrap gap-4">
            {Object.entries(NEWS_CATEGORIES).map(([key, c], i) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="category" value={key} defaultChecked={key === "opslag"} className="h-4 w-4" />
                {c.icon} <strong>{c.label}</strong>
                <span className="text-xs text-slate-400">({c.hint})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Sæt på tavlen</button>
        </div>
      </form>

      <div className="card overflow-hidden max-w-2xl">
        <table className="w-full text-sm">
          <tbody>
            {(news || []).map((n) => (
              <tr key={n.id} className={`border-t border-slate-100 ${n.active ? "" : "opacity-50"}`}>
                <td className="px-4 py-2.5">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${(NEWS_CATEGORIES[n.category] || NEWS_CATEGORIES.opslag).adminBadge}`}>
                    {(NEWS_CATEGORIES[n.category] || NEWS_CATEGORIES.opslag).icon}{" "}
                    {(NEWS_CATEGORIES[n.category] || NEWS_CATEGORIES.opslag).label}
                  </span>
                  <span className="text-slate-800">{n.message}</span>
                  <div className="mt-0.5 text-xs text-slate-400">
                    📅 {scheduleLabel(n)}
                    {n.active && isNewsVisible(n) && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                        Kører nu
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <form action={toggleNews} className="inline">
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="active" value={String(n.active)} />
                    <button className="text-slate-500 hover:underline text-xs mr-3">
                      {n.active ? "Tag af tavlen" : "Sæt på igen"}
                    </button>
                  </form>
                  <form action={deleteNews} className="inline">
                    <input type="hidden" name="id" value={n.id} />
                    <button className="text-red-600 hover:underline text-xs">Slet</button>
                  </form>
                </td>
              </tr>
            ))}
            {(!news || news.length === 0) && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400">Ingen opslag endnu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
