import { STATUSES, STATUS_ORDER } from "@/lib/status";

export default function Legend({ dark = false }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-cyan-400/80" : "text-slate-500"}`}>
        Farver
      </span>
      {STATUS_ORDER.map((key) => (
        <span key={key} className={`flex items-center gap-2 text-sm ${dark ? "text-slate-300" : "text-slate-700"}`}>
          <span className={`h-3 w-3 rounded-sm ${STATUSES[key].dot}`} />
          <span className="font-semibold">{STATUSES[key].label}</span>
          {STATUSES[key].desc && (
            <span className={dark ? "text-slate-500" : "text-slate-400"}>
              ({STATUSES[key].desc})
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
