import Link from "next/link";
import { addDays, toISODate, isoWeek, formatRange } from "@/lib/dates";

export default function WeekNav({ basePath, monday }) {
  const prev = toISODate(addDays(monday, -7));
  const next = toISODate(addDays(monday, 7));
  return (
    <div className="flex items-center gap-2">
      <Link href={`${basePath}?uge=${prev}`} className="btn-ghost px-2.5" aria-label="Forrige uge">
        ‹
      </Link>
      <Link href={basePath} className="btn-ghost">I dag</Link>
      <Link href={`${basePath}?uge=${next}`} className="btn-ghost px-2.5" aria-label="Næste uge">
        ›
      </Link>
      <div className="ml-3">
        <div className="font-display font-bold leading-tight">Uge {isoWeek(monday)}</div>
        <div className="text-xs text-slate-500 leading-tight">{formatRange(monday)}</div>
      </div>
    </div>
  );
}
