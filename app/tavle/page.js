import { getWeekData, db } from "@/lib/db";
import {
  mondayFromParam,
  weekDays,
  toISODate,
  addDays,
  isoWeek,
  formatRange,
  monthInfo,
  MONTH_NAMES,
} from "@/lib/dates";
import { taskCounts, absencePct, topThreeTeams, topThreeByRole, uniqueCases, returnGoalStats } from "@/lib/stats";
import { getGoals } from "@/lib/goals";
import BoardGrid from "@/components/BoardGrid";
import Legend from "@/components/Legend";
import TopThree from "@/components/TopThree";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function BoardPage({ searchParams }) {
  const monday = mondayFromParam(searchParams?.uge);
  const days = weekDays(monday);
  const fromISO = toISODate(monday);
  const toISO = toISODate(addDays(monday, 4));

  const { teams, employees, tasks, absences } = await getWeekData(fromISO, toISO);

  const month = monthInfo(monday);
  const [{ data: monthAbsences }, { data: monthTasks }] = await Promise.all([
    db().from("absences").select("hours,reason").gte("date", month.fromISO).lte("date", month.toISO),
    db().from("tasks").select("id,order_number,status,was_returned").gte("date", month.fromISO).lte("date", month.toISO),
  ]);
  const goals = await getGoals();
  const goal = returnGoalStats(monthTasks || [], goals.returnPct);

  const week = taskCounts(uniqueCases(tasks));
  const weekAbsence = absencePct(absences, employees, 5);
  const monthAbsence = absencePct(monthAbsences || [], employees, month.workdays);
  const top3Teams = topThreeTeams(tasks, teams);
  const top3Electricians = topThreeByRole(tasks, employees, "Elektriker");
  const monthName = MONTH_NAMES[monday.getMonth()];

  const kpis = [
    { label: "Planlagt", value: week.counts.planlagt, accent: "text-slate-300" },
    { label: "I gang", value: week.counts.i_gang, accent: "text-blue-400" },
    { label: "Lukket", value: week.counts.lukket, accent: "text-green-400" },
    { label: "Tilbage", value: week.counts.tilbage, accent: "text-red-400" },
    { label: "Færdiggørelse", value: `${week.completion}%`, accent: "text-cyan-300" },
    { label: "Tilbagekørsel", value: `${week.returnPct}%`, accent: "text-red-400" },
    { label: "Sygefravær (uge)", value: `${weekAbsence.syg.pct}%`, accent: weekAbsence.syg.pct > goals.sickPct ? "text-red-400" : "text-slate-200" },
  ];

  const panelCard = "rounded-xl border border-slate-800 bg-slate-900/60 p-4";

  return (
    <main className="min-h-screen bg-[#070b14] p-6 text-slate-100">
      <AutoRefresh seconds={15} />

      {/* Toplinje */}
      <header className="flex items-end justify-between gap-6 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">
              Uge {isoWeek(monday)}
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              Live
            </span>
          </div>
          <p className="text-slate-500">{formatRange(monday)}</p>
        </div>
        <div className="flex gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-center min-w-[6.5rem]"
            >
              <div className={`font-display text-2xl font-extrabold tabular-nums ${k.accent}`}>
                {k.value}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {k.label}
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_18rem] gap-5 items-start">
        {/* Ugekalender */}
        <BoardGrid
          teams={teams}
          employees={employees}
          tasks={tasks}
          absences={absences}
          days={days}
          mode="board"
        />

        {/* Sidepanel */}
        <aside className="space-y-4">
          <div className={panelCard}>
            <TopThree title="Top 3 montørhold – denne uge" entries={top3Teams} dark />
          </div>
          <div className={panelCard}>
            <TopThree title="Top 3 elektrikere – denne uge" entries={top3Electricians} dark />
          </div>
          <div className={`${panelCard} ${goal.ok && monthAbsence.syg.pct <= goals.sickPct ? "" : "border-red-500/40"}`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-cyan-400/80 mb-2">
              Mål · {monthName[0].toUpperCase() + monthName.slice(1)}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-400">Tilbagekørsel</span>
              <span className="text-right">
                <span className={`font-display text-2xl font-extrabold tabular-nums ${goal.ok ? "text-green-400" : "text-red-400"}`}>
                  {goal.pct}%
                </span>
                <span className="ml-1.5 text-xs text-slate-500">≤ {goal.goalPct}%</span>
              </span>
            </div>
            <div className="text-xs text-slate-500 -mt-0.5">
              {goal.returned} af {goal.total} sager kørt tilbage
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-slate-800 pt-2">
              <span className="text-sm text-slate-400">Sygefravær</span>
              <span className="text-right">
                <span className={`font-display text-2xl font-extrabold tabular-nums ${monthAbsence.syg.pct <= goals.sickPct ? "text-green-400" : "text-red-400"}`}>
                  {monthAbsence.syg.pct}%
                </span>
                <span className="ml-1.5 text-xs text-slate-500">≤ {goals.sickPct}%</span>
              </span>
            </div>
            <div className="text-xs text-slate-500 -mt-0.5">
              {monthAbsence.syg.hours} sygetimer af {monthAbsence.netPossible} mulige (efter ferie)
            </div>
          </div>
          <div className={panelCard}>
            <div className="text-xs font-semibold uppercase tracking-wide text-cyan-400/80 mb-2">
              Sygefravær
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-400">Denne uge</span>
              <span className={`font-display text-xl font-extrabold tabular-nums ${weekAbsence.syg.pct > goals.sickPct ? "text-red-400" : "text-slate-100"}`}>
                {weekAbsence.syg.pct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm mt-1">
              <span className="text-slate-400">
                {monthName[0].toUpperCase() + monthName.slice(1)}
              </span>
              <span className={`font-display text-xl font-extrabold tabular-nums ${monthAbsence.syg.pct > goals.sickPct ? "text-red-400" : "text-slate-100"}`}>
                {monthAbsence.syg.pct}%
              </span>
            </div>
            <div className="mt-3 border-t border-slate-800 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-400/70 mb-1">
                🏖 Ferie / fri
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Denne uge</span>
                <span className="tabular-nums">{weekAbsence.ferie.pct}% af timerne</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{monthName[0].toUpperCase() + monthName.slice(1)}</span>
                <span className="tabular-nums">{monthAbsence.ferie.pct}% af timerne</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-slate-600">
              Sygefravær måles af mulige timer efter planlagt ferie/fri.
            </p>
          </div>
        </aside>
      </div>

      {/* Farveforklaring - altid synlig nederst */}
      <footer className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <Legend dark />
      </footer>
    </main>
  );
}
