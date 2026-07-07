import Link from "next/link";
import { getPendingCases } from "@/lib/review";
import { RETURN_REASONS } from "@/lib/status";
import { resolveCase } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export default async function MorningReview({ searchParams }) {
  const { yesterday, older, prevDay } = await getPendingCases();
  const showAll = searchParams?.alle === "1";
  const pending = showAll ? [...yesterday, ...older] : yesterday;

  return (
    <main>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Morgengennemgang</h1>
        <Link href="/admin" className="btn-ghost">Videre til dashboard →</Link>
      </div>
      <p className="text-sm text-slate-500 mb-5 max-w-2xl">
        Sager fra seneste arbejdsdag ({formatDate(prevDay)}), der hverken er lukket eller
        planlagt videre. Kryds af: blev den færdig, eller skal den køre tilbage? Afgøres i Ordrestyring – tavlen følger med. Sager, der
        allerede er planlagt igen i Ordrestyring, vises ikke – de kører efter planen.
      </p>

      {pending.length === 0 ? (
        <div className="card max-w-2xl p-10 text-center">
          <div className="text-4xl mb-2">✓</div>
          <div className="font-display text-lg font-bold">Alt er gennemgået</div>
          <p className="text-sm text-slate-500 mt-1">
            Ingen sager fra {formatDate(prevDay)} afventer afklaring. God arbejdslyst!
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {pending.map((c) => (
            <div key={c.orderNumber} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-slate-900">
                  {c.orderNumber}
                  {c.title ? <span className="font-sans font-medium text-slate-600"> · {c.title}</span> : null}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {[c.customerAddress, c.names.join(" · "), `planlagt til ${formatDate(c.lastDate)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              {c.synced ? (
                <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  → Sæt status i <strong>Ordrestyring</strong>: &quot;klar til fakturering&quot;
                  eller &quot;kræver genbesøg&quot; – tavlen følger med af sig selv.
                </div>
              ) : (
                <form action={resolveCase} className="flex items-center gap-2">
                  <input type="hidden" name="order_number" value={c.orderNumber} />
                  <button
                    type="submit"
                    name="decision"
                    value="lukket"
                    className="btn bg-green-600 text-white hover:bg-green-500"
                  >
                    ✓ Færdig
                  </button>
                  <select name="return_reason" defaultValue="Andet" className="input w-auto py-2">
                    {RETURN_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    name="decision"
                    value="tilbage"
                    className="btn-danger"
                  >
                    ↩ Tilbage
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {!showAll && older.length > 0 && (
        <p className="mt-4 text-sm">
          <Link href="/admin/morgen?alle=1" className="text-blue-600 hover:underline">
            Vis også {older.length} ældre {older.length === 1 ? "uafklaret sag" : "uafklarede sager"} →
          </Link>
        </p>
      )}
      {showAll && (
        <p className="mt-4 text-sm">
          <Link href="/admin/morgen" className="text-blue-600 hover:underline">
            ← Vis kun seneste arbejdsdag
          </Link>
        </p>
      )}
    </main>
  );
}
