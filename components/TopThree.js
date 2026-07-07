const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#fbbf24", "#cbd5e1", "#d97706"];

// Generisk Top 3: entries = [{ key, label, color, count }]
export default function TopThree({ title, entries, unit = "sagsdage", unitSingular = "sagsdag", dark = false }) {
  return (
    <div>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? "text-cyan-300 !text-[13px] font-extrabold tracking-widest" : "text-slate-500"}`}>
        {title}
      </div>
      {entries.length === 0 ? (
        <p className={`text-sm ${dark ? "text-slate-500" : "text-slate-400"}`}>
          Ingen lukkede sager endnu
        </p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => (
            <li key={e.key} className="flex items-center gap-2 text-sm">
              <span
                className="w-6 font-display text-base font-bold"
                style={dark ? { color: MEDAL_COLORS[i], textShadow: `0 0 10px ${MEDAL_COLORS[i]}88` } : { color: MEDAL_COLORS[i] }}
              >
                {MEDALS[i]}
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: e.color, boxShadow: dark ? `0 0 6px ${e.color}88` : "none" }}
              />
              <span className={`font-semibold truncate ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {e.label}
              </span>
              <span className={`ml-auto tabular-nums ${dark ? "text-slate-400" : "text-slate-600"}`}>
                {e.count} {e.count === 1 ? unitSingular : unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
