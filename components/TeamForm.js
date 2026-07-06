import Link from "next/link";

export default function TeamForm({ team, action }) {
  const t = team || {};
  return (
    <form action={action} className="card p-6 max-w-xl space-y-4">
      {t.id && <input type="hidden" name="id" value={t.id} />}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="label" htmlFor="name">Holdnavn</label>
          <input id="name" name="name" required defaultValue={t.name || ""} className="input" placeholder="fx Hold 1" />
        </div>
        <div>
          <label className="label" htmlFor="color">Farve</label>
          <input id="color" name="color" type="color" defaultValue={t.color || "#2563eb"}
            className="h-[38px] w-full cursor-pointer rounded-md border border-slate-300 bg-white px-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <label className="label" htmlFor="sort_order">Sortering</label>
          <input id="sort_order" name="sort_order" type="number" defaultValue={t.sort_order ?? 0} className="input" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" name="active" defaultChecked={t.active ?? true} className="h-4 w-4" />
          Aktivt hold
        </label>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" className="btn-primary">{t.id ? "Gem ændringer" : "Opret hold"}</button>
        <Link href="/admin/hold" className="btn-ghost">Annullér</Link>
      </div>
    </form>
  );
}
