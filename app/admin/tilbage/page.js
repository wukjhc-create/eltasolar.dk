import { db } from "@/lib/db";
import { RETURN_REASONS } from "@/lib/status";
import { updateReturnReason, deleteReturn } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}-${y}`;
}

export default async function ReturnsPage() {
  const { data: events } = await db()
    .from("returns")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
        Tilbagekørsler (logbog)
      </h1>
      <p className="text-sm text-slate-500 mb-5 max-w-3xl">
        Én linje pr. gang en sag er kørt tilbage – tæller i statistikken i den uge og måned,
        den blev registreret, og modregnes aldrig, selv om sagen senere lukkes. Ret årsagen
        her (til årsags-statistik), og slet kun linjer, der er registreret ved en fejl.
      </p>

      <div className="card overflow-hidden max-w-4xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Dato</th>
              <th className="px-4 py-2.5">Sag</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Årsag</th>
              <th className="px-4 py-2.5 text-right">Handling</th>
            </tr>
          </thead>
          <tbody>
            {(events || []).map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 tabular-nums">{formatDate(e.date)}</td>
                <td className="px-4 py-2.5">
                  {e.fag && (
                    <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${e.fag === "el" ? "bg-yellow-500 text-yellow-950" : "bg-slate-600 text-white"}`}>
                      {e.fag === "el" ? "EL" : "Montage"}
                    </span>
                  )}
                  <span className="font-semibold text-slate-800">{e.order_number}</span>
                  {e.title && <span className="text-slate-500"> · {e.title}</span>}
                </td>
                <td className="px-4 py-2.5">
                  {e.active ? (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Aktivt genbesøg
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      Afsluttet
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <form action={updateReturnReason} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <select name="reason" defaultValue={e.reason} className="input w-auto py-1.5">
                      {RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button className="text-blue-600 hover:underline text-xs">Gem</button>
                  </form>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <form action={deleteReturn}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="text-red-600 hover:underline text-xs">
                      Slet (fejl)
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Ingen tilbagekørsler registreret endnu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
