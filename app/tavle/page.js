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
import { taskCounts, absencePct, topThreeTeams, topThreeByRole, uniqueCases, returnGoalStats, fagCaseDays } from "@/lib/stats";
import { getGoals, getRevenue } from "@/lib/goals";
import { getReturns } from "@/lib/returns";
import { isNewsVisible, nowInCopenhagen, NEWS_CATEGORIES, CATEGORY_ORDER } from "@/lib/news";
import BoardGrid from "@/components/BoardGrid";
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
  const [{ data: monthAbsences }, { data: monthTasks }, monthReturns, weekReturns] = await Promise.all([
    db().from("absences").select("hours,reason,employee_id").gte("date", month.fromISO).lte("date", month.toISO),
    db().from("tasks").select("id,order_number,status").gte("date", month.fromISO).lte("date", month.toISO),
    getReturns(month.fromISO, month.toISO),
    getReturns(fromISO, toISO),
  ]);
  const [goals, revenue, { data: newsData }] = await Promise.all([
    getGoals(),
    getRevenue(),
    db().from("news").select("*").eq("active", true).order("breaking", { ascending: false }).order("created_at", { ascending: false }).limit(10),
  ]);
  const nowCph = nowInCopenhagen();
  const news = (newsData || []).filter((n) => isNewsVisible(n, nowCph));
  const goal = returnGoalStats(monthTasks || [], monthReturns, goals.returnPct);
  const weekReturn = returnGoalStats(tasks, weekReturns, goals.returnPct);

  const week = taskCounts(fagCaseDays(tasks, employees));
  const weekAbsence = absencePct(absences, employees, 5);
  const monthAbsence = absencePct(monthAbsences || [], employees, month.workdays);
  const top3Teams = topThreeTeams(tasks, teams);
  const top3Electricians = topThreeByRole(tasks, employees, "Elektriker");
  const monthName = MONTH_NAMES[monday.getMonth()];

  const kpis = [
    { label: "Planlagt", value: week.counts.planlagt, accent: "text-slate-300", sub: "sagsdage" },
    { label: "I gang", value: week.counts.i_gang, accent: "text-blue-400" },
    { label: "Lukket", value: week.counts.lukket, accent: "text-green-400" },
    { label: "Tilbage", value: week.counts.tilbage, accent: "text-red-400" },
    { label: "Færdiggørelse", value: `${week.completion}%`, accent: "text-cyan-300" },
    { label: "Tilbagekørsel", value: `${weekReturn.pct}%`, accent: weekReturn.ok ? "text-slate-200" : "text-red-400" },
    { label: "Sygefravær (uge)", value: `${weekAbsence.syg.pct}%`, accent: weekAbsence.syg.pct > goals.sickPct ? "text-red-400" : "text-slate-200" },
  ];

  const panelCard = "rise panel-accent rounded-xl border border-slate-700/80 bg-slate-900/70 p-4 pt-5";

  return (
    <main className="board-scene min-h-screen bg-[#070b14] p-6 text-slate-100">
      <AutoRefresh seconds={15} />

      {/* Toplinje */}
      <header className="flex items-end justify-between gap-6 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="title-gradient font-display text-4xl font-extrabold tracking-tight">
              Uge {isoWeek(monday)}
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Live
            </span>
            <span className="text-xs text-slate-500">
              Opdateret kl.{" "}
              {new Date().toLocaleTimeString("da-DK", {
                timeZone: "Europe/Copenhagen",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-slate-500">{formatRange(monday)}</p>
        </div>
        <div className="flex gap-3">
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className="rise rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-center min-w-[6.5rem]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`num-glow font-display text-2xl font-extrabold tabular-nums ${k.accent}`}>
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
          <div className={`${panelCard} accent-cyan`}>
            <TopThree title="Top 3 montørhold – denne uge" entries={top3Teams} dark />
          </div>
          <div className={`${panelCard} accent-yellow`}>
            <TopThree title="Top 3 elektrikere – denne uge" entries={top3Electricians} dark />
          </div>
          <div className={`${panelCard} ${goal.ok && monthAbsence.syg.pct <= goals.sickPct ? "accent-green" : "accent-red border-red-500/40"}`}>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-cyan-300 mb-2">
              Tilbagekørsel <span className="text-slate-400 normal-case font-semibold">(mål ≤ {goal.goalPct}%)</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-400">Denne uge</span>
              <span className={`num-glow font-display text-2xl font-extrabold tabular-nums ${weekReturn.ok ? "text-green-400" : "text-red-400"}`}>
                {weekReturn.pct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm mt-1">
              <span className="text-slate-400">{monthName[0].toUpperCase() + monthName.slice(1)}</span>
              <span className={`num-glow font-display text-2xl font-extrabold tabular-nums ${goal.ok ? "text-green-400" : "text-red-400"}`}>
                {goal.pct}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {goal.returned} tilbagekørsler i {monthName} ({goal.total} sager) – tælles den dag de registreres
            </div>

            <div className="mt-3 border-t border-slate-800 pt-2">
              <div className="text-[13px] font-extrabold uppercase tracking-widest text-cyan-300 mb-2">
                Sygefravær <span className="text-slate-400 normal-case font-semibold">(mål ≤ {goals.sickPct}%)</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-400">Denne uge</span>
                <span className={`num-glow font-display text-2xl font-extrabold tabular-nums ${weekAbsence.syg.pct <= goals.sickPct ? "text-green-400" : "text-red-400"}`}>
                  {weekAbsence.syg.pct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-sm mt-1">
                <span className="text-slate-400">{monthName[0].toUpperCase() + monthName.slice(1)}</span>
                <span className={`num-glow font-display text-2xl font-extrabold tabular-nums ${monthAbsence.syg.pct <= goals.sickPct ? "text-green-400" : "text-red-400"}`}>
                  {monthAbsence.syg.pct}%
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {monthAbsence.syg.hours} sygetimer af {monthAbsence.netPossible} mulige (efter ferie)
              </div>
            </div>
          </div>
          <div className={`${panelCard} accent-sky`}>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-sky-300 mb-2">
              🏖 Ferie / fri
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-400">Denne uge</span>
              <span className="num-glow font-display text-2xl font-extrabold tabular-nums text-sky-300">
                {weekAbsence.ferie.pct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm mt-1">
              <span className="text-slate-400">
                {monthName[0].toUpperCase() + monthName.slice(1)}
              </span>
              <span className="num-glow font-display text-2xl font-extrabold tabular-nums text-sky-300">
                {monthAbsence.ferie.pct}%
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-slate-600">
              Andel af timerne der er planlagt ferie/fri. Sygefravær (KPI øverst og Mål-kortet)
              måles af timerne efter ferie-fradrag.
            </p>
          </div>
        </aside>
      </div>

      {/* Omsaetningsbjaelke: hvor langt er vi fra maanedens maal? */}
      {revenue.goal > 0 && (() => {
        const pct = Math.min(Math.round((revenue.current / revenue.goal) * 100), 100);
        const rawPct = Math.round((revenue.current / revenue.goal) * 100);
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const expectedPct = Math.min(Math.round((now.getDate() / daysInMonth) * 100), 100);
        const ahead = rawPct >= expectedPct;
        const done = rawPct >= 100;
        const fmt = (n) => Math.round(n).toLocaleString("da-DK");
        return (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400/80">
                Omsætning · {monthName[0].toUpperCase() + monthName.slice(1)}
              </span>
              <span className="text-sm text-slate-300">
                <span className={`num-glow font-display text-2xl font-extrabold tabular-nums ${done ? "text-green-400" : ahead ? "text-green-300" : "text-amber-400"}`}>
                  {fmt(revenue.current)} kr
                </span>
                <span className="text-slate-500"> af {fmt(revenue.goal)} kr · </span>
                <span className={`font-bold tabular-nums ${done ? "text-green-400" : ahead ? "text-green-300" : "text-amber-400"}`}>
                  {rawPct}%
                </span>
                {done && " 🎉 Mål nået!"}
              </span>
            </div>
            <div className="relative h-5 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
              <div
                className={`bar-shine h-full rounded-full transition-all ${
                  done
                    ? "bg-gradient-to-r from-green-500 to-emerald-400"
                    : ahead
                      ? "bg-gradient-to-r from-cyan-500 to-green-400"
                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                }`}
                style={{ width: `${pct}%`, boxShadow: done ? "0 0 18px rgba(34,197,94,0.7)" : "0 0 12px rgba(34,211,238,0.35)" }}
              />
              {/* Markoer: her burde vi vaere i dag */}
              <div
                className="absolute top-0 h-full w-0.5 bg-white/70"
                style={{ left: `${expectedPct}%` }}
                title="Forventet i dag"
              />
            </div>
            <div className="relative mt-1 h-4 text-[10px] text-slate-500">
              <span className="absolute -translate-x-1/2" style={{ left: `${expectedPct}%` }}>
                ▲ forventet i dag ({expectedPct}%)
              </span>
            </div>
          </div>
        );
      })()}

      {/* Tre nyhedskanaler - hver bjaelke vises kun naar den har noget i luften */}
      {CATEGORY_ORDER.map((catKey) => {
        const cat = NEWS_CATEGORIES[catKey];
        const catNews = news.filter((n) => (n.category || "opslag") === catKey);
        if (catNews.length === 0) return null;
        const items = catNews.map((n) => (
          <span key={n.id} className="mx-8 inline-flex items-center gap-2">
            <span className={cat.text}>{n.message}</span>
            <span className="text-slate-600">•</span>
          </span>
        ));
        return (
          <footer
            key={catKey}
            className={`mt-3 overflow-hidden rounded-xl border bg-slate-900/80 ${cat.bar}`}
          >
            <div className="flex items-stretch">
              <div
                className={`flex w-52 shrink-0 items-center justify-center px-3 font-display text-xs font-extrabold uppercase tracking-widest ${cat.badge}`}
              >
                {cat.icon} {cat.label}
              </div>
              <div className="ticker-mask flex-1 overflow-hidden py-2.5 text-sm">
                <div className="ticker-track">
                  <span>{items}</span>
                  <span aria-hidden="true">{items}</span>
                </div>
              </div>
            </div>
          </footer>
        );
      })}
    </main>
  );
}
