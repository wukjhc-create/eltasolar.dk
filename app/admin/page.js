import Link from "next/link";
import { getWeekData } from "@/lib/db";
import { mondayFromParam, toISODate, addDays, isoWeek, formatRange } from "@/lib/dates";
import { taskCounts, absencePct, topThreeTeams, topThreeByRole, uniqueCases, returnGoalStats } from "@/lib/stats";
import { getPendingCases } from "@/lib/review";
import { getGoals } from "@/lib/goals";
import { saveGoals } from "./actions";
import { monthInfo, MONTH_NAMES } from "@/lib/dates";
import { db } from "@/lib/db";
import TopThree from "@/components/TopThree";
import WeekNav from "@/components/WeekNav";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }) {
  const monday = mondayFromParam(searchParams?.uge);
  const fromISO = toISODate(monday);
  const toISO = toISODate(addDays(monday, 4));
  const { teams, employees, tasks, absences } = await getWeekData(fromISO, toISO);

  const month = monthInfo(monday);
  const [review, { data: monthTasks }, { data: monthAbsences }, goals] = await Promise.all([
    getPendingCases(),
    db().from("tasks").select("id,order_number,status,was_returned").gte("date", month.fromISO).lte("date", month.toISO),
    db().from("absences").select("hours,reason").gte("date", month.fromISO).lte("date", month.toISO),
    getGoals(),
  ]);
  const monthAbs = absencePct(monthAbsences || [], employees, month.workdays);
  const pending = review.yesterday;
  const goal = returnGoalStats(monthTasks || [], goals.returnPct);
  const monthName = MONTH_NAMES[monday.getMonth()];

  const week = taskCounts(uniqueCases(tasks));
  const absence = absencePct(absences, employees, 5);
  const top3Teams = topThreeTeams(tasks, teams);
  const top3Electricians = topThreeByRole(tasks, employees, "Elektriker");

  const stats = [
    { label: "Planlagte sager", value: week.total, sub: "alle sager i ugen" },
    { label: "Lukkede sager", value: week.counts.lukket, sub: `${week.completion}% færdiggørelse` },
    { label: "Tilbage-sager", value: week.counts.tilbage, sub: `${week.returnPct}% tilbagekørsel` },
    {
      label: `Tilbagekørsel · ${monthName}`,
      value: `${goal.pct}%`,
      sub: `mål ≤ ${goal.goalPct}% · ${goal.returned} af ${goal.total} sager`,
      accent: goal.ok ? "text-green-600" : "text-red-600",
    },
    {
      label: `Sygefravær · ${monthName}`,
      value: `${monthAbs.syg.pct}%`,
      sub: `mål ≤ ${goals.sickPct}% · ${monthAbs.syg.hours} sygetimer af ${monthAbs.netPossible} mulige`,
      accent: monthAbs.syg.pct <= goals.sickPct ? "text-green-600" : "text-red-600",
    },
    { label: "Sygefravær (uge)", value: `${absence.syg.pct}%`, sub: `Ferie/fri ${absence.ferie.pct}% af timerne`, accent: absence.syg.pct <= goals.sickPct ? "" : "text-red-600" },
  ];

  return (
    <main>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Dashboard · Uge {isoWeek(monday)}
        </h1>
        <WeekNav basePath="/admin" monday={monday} />
      </div>

      {pending.length > 0 && (
        <Link
          href="/admin/morgen"
          className="mb-5 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 hover:bg-amber-100"
        >
          <span className="text-sm font-semibold text-amber-900">
            ⚠ Morgengennemgang: {pending.length} {pending.length === 1 ? "sag" : "sager"} fra
            tidligere dage mangler afklaring
          </span>
          <span className="btn-primary">Gennemgå nu</span>
        </Link>
      )}

      <div className="grid grid-cols-6 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {s.label}
            </div>
            <div className={`font-display text-3xl font-extrabold tabular-nums mt-1 ${s.accent || ""}`}>
              {s.value}
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <TopThree title="Top 3 montørhold – denne uge" entries={top3Teams} />
        </div>
        <div className="card p-5">
          <TopThree title="Top 3 elektrikere – denne uge" entries={top3Electricians} />
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Genveje
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/kalender?uge=${fromISO}`} className="btn-primary">
              Åbn kalender
            </Link>
            <Link href={`/admin/fravaer?uge=${fromISO}`} className="btn-ghost">
              Registrér fravær
            </Link>
            <Link href="/admin/medarbejdere" className="btn-ghost">
              Medarbejdere
            </Link>
            <Link href="/admin/hold" className="btn-ghost">
              Hold
            </Link>
          </div>
          <form action={saveGoals} className="mt-4 border-t border-slate-100 pt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Mål (vises på tavlen)
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="label" htmlFor="return_pct">Tilbagekørsel %</label>
                <input id="return_pct" name="return_pct" type="number" step="0.5" min="0"
                  defaultValue={goals.returnPct} className="input w-28" />
              </div>
              <div>
                <label className="label" htmlFor="sick_pct">Sygefravær %</label>
                <input id="sick_pct" name="sick_pct" type="number" step="0.5" min="0"
                  defaultValue={goals.sickPct} className="input w-28" />
              </div>
              <button className="btn-ghost">Gem mål</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
