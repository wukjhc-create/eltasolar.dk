import Link from "next/link";
import { STATUSES, STATUS_ORDER, RETURN_REASONS } from "@/lib/status";

// Server-renderet formular. Ved status "Tilbage" vaelges aarsag i dropdown -
// aarsagen gemmes kun, naar status faktisk er "Tilbage" (haandteres i actions).
export default function TaskForm({ task, employees, action, deleteAction, weekParam }) {
  const t = task || {};
  const activeEmployees = employees.filter((e) => e.active);
  return (
    <form action={action} className="card p-6 max-w-2xl space-y-4">
      {t.id && <input type="hidden" name="id" value={t.id} />}
      <input type="hidden" name="uge" value={weekParam || ""} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="date">Dato</label>
          <input id="date" name="date" type="date" required defaultValue={t.date || ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="employee_id">Medarbejder</label>
          <select id="employee_id" name="employee_id" required defaultValue={t.employee_id || ""} className="input">
            <option value="" disabled>Vælg medarbejder</option>
            {activeEmployees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="order_number">Ordrenummer</label>
          <input id="order_number" name="order_number" defaultValue={t.order_number || ""} className="input" placeholder="fx 24-1087" />
        </div>
        <div>
          <label className="label" htmlFor="title">Kort tekst</label>
          <input id="title" name="title" defaultValue={t.title || ""} className="input" placeholder="fx Montage af køkken" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="customer_address">Kunde / adresse</label>
        <input id="customer_address" name="customer_address" defaultValue={t.customer_address || ""} className="input" placeholder="fx Jensen, Storgade 12, Sorø" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={t.status || "planlagt"} className="input">
            {STATUS_ORDER.map((key) => (
              <option key={key} value={key}>{STATUSES[key].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="return_reason">Tilbage-årsag (kun ved status Tilbage)</label>
          <select id="return_reason" name="return_reason" defaultValue={t.return_reason || "Andet"} className="input">
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">Note</label>
        <textarea id="note" name="note" rows={3} defaultValue={t.note || ""} className="input" />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" className="btn-primary">
          {t.id ? "Gem ændringer" : "Opret opgave"}
        </button>
        <Link href={`/admin/kalender?uge=${weekParam || ""}`} className="btn-ghost">
          Annullér
        </Link>
        {t.id && deleteAction && (
          <button type="submit" formAction={deleteAction} className="btn-danger ml-auto">
            Slet opgave
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Flyt en opgave ved at ændre dato eller medarbejder og gemme.
      </p>
    </form>
  );
}
