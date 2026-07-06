import Link from "next/link";
import { db } from "@/lib/db";
import { toggleEmployeeActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const client = db();
  const [{ data: employees }, { data: teams }] = await Promise.all([
    client.from("employees").select("*").order("sort_order").order("name"),
    client.from("teams").select("*").order("sort_order").order("name"),
  ]);
  const teamName = (id) => teams?.find((t) => t.id === id)?.name || "–";
  const teamColor = (id) => teams?.find((t) => t.id === id)?.color || "#cbd5e1";

  return (
    <main>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Medarbejdere</h1>
        <Link href="/admin/medarbejdere/ny" className="btn-primary">+ Ny medarbejder</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Navn</th>
              <th className="px-4 py-2.5">Rolle</th>
              <th className="px-4 py-2.5">Hold</th>
              <th className="px-4 py-2.5">Timer/dag</th>
              <th className="px-4 py-2.5">På tavlen</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Handling</th>
            </tr>
          </thead>
          <tbody>
            {(employees || []).map((e) => (
              <tr key={e.id} className={`border-t border-slate-100 ${e.active ? "" : "opacity-50"}`}>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{e.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{e.role}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamColor(e.team_id) }} />
                    {teamName(e.team_id)}
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{Number(e.daily_hours)}</td>
                <td className="px-4 py-2.5">{e.show_on_board ? "Ja" : "Nej"}</td>
                <td className="px-4 py-2.5">{e.active ? "Aktiv" : "Inaktiv"}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link href={`/admin/medarbejdere/${e.id}`} className="text-blue-600 hover:underline">
                      Redigér
                    </Link>
                    <form action={toggleEmployeeActive}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="active" value={String(e.active)} />
                      <button className="text-slate-500 hover:underline">
                        {e.active ? "Deaktivér" : "Aktivér"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(!employees || employees.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Ingen medarbejdere endnu. Opret den første med knappen øverst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
