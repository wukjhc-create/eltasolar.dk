import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const client = db();
  const [{ data: teams }, { data: employees }] = await Promise.all([
    client.from("teams").select("*").order("sort_order").order("name"),
    client.from("employees").select("id,team_id,active"),
  ]);
  const memberCount = (id) =>
    (employees || []).filter((e) => e.team_id === id && e.active).length;

  return (
    <main>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Hold</h1>
        <Link href="/admin/hold/ny" className="btn-primary">+ Nyt hold</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Hold</th>
              <th className="px-4 py-2.5">Aktive medarbejdere</th>
              <th className="px-4 py-2.5">Sortering</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Handling</th>
            </tr>
          </thead>
          <tbody>
            {(teams || []).map((t) => (
              <tr key={t.id} className={`border-t border-slate-100 ${t.active ? "" : "opacity-50"}`}>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{memberCount(t.id)}</td>
                <td className="px-4 py-2.5 tabular-nums">{t.sort_order}</td>
                <td className="px-4 py-2.5">{t.active ? "Aktivt" : "Inaktivt"}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/admin/hold/${t.id}`} className="text-blue-600 hover:underline">
                    Redigér
                  </Link>
                </td>
              </tr>
            ))}
            {(!teams || teams.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Ingen hold endnu. Opret det første med knappen øverst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
