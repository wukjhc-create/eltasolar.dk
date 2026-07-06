import Link from "next/link";
import { ROLES } from "@/lib/status";

export default function EmployeeForm({ employee, teams, action }) {
  const e = employee || {};
  return (
    <form action={action} className="card p-6 max-w-2xl space-y-4">
      {e.id && <input type="hidden" name="id" value={e.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="name">Navn</label>
          <input id="name" name="name" required defaultValue={e.name || ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="role">Rolle</label>
          <select id="role" name="role" defaultValue={e.role || "Montør"} className="input">
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="team_id">Hold</label>
          <select id="team_id" name="team_id" defaultValue={e.team_id || ""} className="input">
            <option value="">Intet hold</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="daily_hours">Timer pr. dag</label>
          <input id="daily_hours" name="daily_hours" type="number" step="0.5" min="0"
            defaultValue={e.daily_hours ?? 7.5} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sort_order">Sortering</label>
          <input id="sort_order" name="sort_order" type="number"
            defaultValue={e.sort_order ?? 0} className="input" />
        </div>
      </div>

      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="active" defaultChecked={e.active ?? true} className="h-4 w-4" />
          Aktiv
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="show_on_board" defaultChecked={e.show_on_board ?? true} className="h-4 w-4" />
          Vis på tavlen
        </label>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" className="btn-primary">
          {e.id ? "Gem ændringer" : "Opret medarbejder"}
        </button>
        <Link href="/admin/medarbejdere" className="btn-ghost">Annullér</Link>
      </div>
    </form>
  );
}
