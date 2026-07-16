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
import { getGoals, getRevenue, getFleetCarNames } from "@/lib/goals";
import { getReturns } from "@/lib/returns";
import { isNewsVisible, nowInCopenhagen, NEWS_CATEGORIES, CATEGORY_ORDER } from "@/lib/news";
import { fetchGpsSmart } from "@/lib/ordrestyring";
import { latestByCar, formatSince } from "@/lib/fleet";
import FleetMap from "@/components/FleetMap";
import SlideShow from "@/components/SlideShow";
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
    db().from("tasks").select("id,order_number,status,team_id,employee_id,date").gte("date", month.fromISO).lte("date", month.toISO),
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

  // Flaaden vises doegnet rundt - kun med Bil-numre ("Bil 1" osv. i OS Vehicle)
  let fleetCars = [];
  let fleetTotal = 0;
  let fleetError = null;
  {
    const numbers = [...new Set(tasks.map((t) => t.order_number).filter(Boolean))];
    const gps = await fetchGpsSmart(numbers, await getFleetCarNames());
    if (gps.error) fleetError = gps.error;
    else {
      const all = latestByCar(gps.entries);
      fleetTotal = all.length;
      fleetCars = all.filter((c) => c.bilNo != null);
    }
  }

  // ELTA Standard: aktive slides filtreret paa dato og ugedag
  let slides = [];
  let slidesDefaultDuration = 15;
  {
    const [{ data: rawSlides }, { data: slideSettings }] = await Promise.all([
      db().from("info_slides").select("*").eq("is_active", true).order("sort_order"),
      db().from("settings").select("key,value").in("key", ["slides_default_duration", "slides_paused"]),
    ]);
    const map = Object.fromEntries((slideSettings || []).map((r) => [r.key, r.value]));
    slidesDefaultDuration = parseInt(map.slides_default_duration, 10) || 15;
    const paused = map.slides_paused === "1";
    const todayISO = nowCph.isoDate;
    if (!paused) {
      slides = (rawSlides || []).filter((sl) => {
        if (sl.start_date && sl.start_date > todayISO) return false;
        if (sl.end_date && sl.end_date < todayISO) return false;
        if (sl.weekdays) {
          const days = String(sl.weekdays).split(",").map((d) => parseInt(d, 10));
          if (!days.includes(nowCph.isoDay)) return false;
        }
        return true;
      });
    }
  }
  const goal = returnGoalStats(monthTasks || [], monthReturns, goals.returnPct);
  const weekReturn = returnGoalStats(tasks, weekReturns, goals.returnPct);

  const week = taskCounts(fagCaseDays(tasks, employees));
  const weekAbsence = absencePct(absences, employees, 5);
  const monthAbsence = absencePct(monthAbsences || [], employees, month.workdays);
  const top3Teams = topThreeTeams(tasks, teams);
  const top3Electricians = topThreeByRole(tasks, employees, "Elektriker");
  const top3TeamsMonth = topThreeTeams(monthTasks || [], teams);
  const top3ElectriciansMonth = topThreeByRole(monthTasks || [], employees, "Elektriker");
  const monthName = MONTH_NAMES[monday.getMonth()];
  const monthLabel = monthName[0].toUpperCase() + monthName.slice(1);

  const kpis = [
    { label: "Planlagt", value: week.counts.planlagt, accent: "text-[#26215C]", sub: "sagsdage" },
    { label: "I gang", value: week.counts.i_gang, accent: "text-[#185FA5]" },
    { label: "Lukket", value: week.counts.lukket, accent: "text-[#3B6D11]" },
    { label: "Tilbage", value: week.counts.tilbage, accent: "text-[#A32D2D]" },
    { label: "Færdiggørelse", value: `${week.completion}%`, accent: "text-cyan-300" },
    { label: "Tilbagekørsel", value: `${weekReturn.pct}%`, accent: weekReturn.ok ? "text-[#26215C]" : "text-[#A32D2D]" },
    { label: "Sygefravær (uge)", value: `${weekAbsence.syg.pct}%`, accent: weekAbsence.syg.pct > goals.sickPct ? "text-[#A32D2D]" : "text-[#26215C]" },
  ];

  const panelCard = "rise rounded-2xl border border-[#E7E1D2] bg-white p-4";

  return (
    <main className="min-h-screen bg-[#FAF6EC] p-6 text-[#26215C]">
      <AutoRefresh seconds={10} />

      {/* Toplinje */}
      <header className="flex items-end justify-between gap-6 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EF9F27] text-2xl">
              ☀️
            </span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#26215C]">
              Uge {isoWeek(monday)}
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-transparent bg-[#EAF3DE] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#3B6D11]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#639922] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#639922]" />
              </span>
              Live
            </span>
            <span className="text-xs text-[#888780]">
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
              className="rise rounded-xl border border-[#E7E1D2] bg-white px-4 py-2.5 text-center min-w-[6.5rem]"
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
        {/* Ugekalender + nyhedskanaler i venstre kolonne */}
        <div className="min-w-0">
        <BoardGrid
          teams={teams}
          employees={employees}
          tasks={tasks}
          absences={absences}
          days={days}
          mode="board"
        />

      {/* Tre nyhedskanaler - hver bjaelke vises kun naar den har noget i luften */}
      {CATEGORY_ORDER.map((catKey) => {
        const cat = NEWS_CATEGORIES[catKey];
        const catNews = news.filter((n) => (n.category || "opslag") === catKey);
        if (catNews.length === 0) return null;
        const items = catNews.map((n) => (
          <span key={n.id} className="mx-8 inline-flex items-center gap-2">
            <span className={cat.text}>{n.message}</span>
            <span className="text-[#D3D1C7]">•</span>
          </span>
        ));
        return (
          <footer
            key={catKey}
            className={`mt-2 overflow-hidden rounded-xl border bg-white ${cat.bar}`}
          >
            <div className="flex items-stretch">
              <div
                className={`flex w-80 shrink-0 items-center justify-center px-4 font-display text-2xl font-extrabold uppercase tracking-widest ${cat.badge}`}
              >
                {cat.icon} {cat.label}
              </div>
              <div className="ticker-mask flex-1 overflow-hidden py-5 text-4xl font-semibold">
                <div className="ticker-track">
                  <span>{items}</span>
                  <span aria-hidden="true">{items}</span>
                </div>
              </div>
            </div>
          </footer>
        );
      })}

        {/* Flaaden: sidst kendte position pr. bil (kun arbejdstid, kun Bil-numre) */}
        {fleetCars.length > 0 ? (
          <div className="rise mt-3 overflow-hidden rounded-2xl border border-[#E7E1D2] bg-white p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] font-extrabold uppercase tracking-widest text-[#26215C]">
                🚗 Flåden
              </span>
              <span className="text-xs text-[#888780]">
                {fleetCars.filter((c) => c.moving).length} i bevægelse ·{" "}
                {fleetCars.filter((c) => !c.moving).length} holder · sidst kendte position
              </span>
            </div>
            <FleetMap cars={fleetCars} height={340} />
          </div>
        ) : (
          <div className="mt-3 px-1 text-xs text-[#888780]">
            🚗 Flåden:{" "}
            {fleetError
              ? "kunne ikke hente GPS-data – se detaljer under Admin → Flåden"
              : fleetTotal > 0
                ? `${fleetTotal} biler fundet – omdøb dem til "Bil 1"–"Bil ${fleetTotal}" i OS Vehicle, så vises de på kortet her`
                : "ingen GPS-ture fundet endnu – tjek at OS Vehicle-enhederne er aktive"}
          </div>
        )}

        {/* ELTA Standard: diasshow med kultur- og kvalitetsslides */}
        {slides.length > 0 && (
          <div className="rise mt-3 overflow-hidden rounded-2xl border border-[#E7E1D2] bg-white">
            <div className="aspect-[16/7] w-full">
              <SlideShow slides={slides} defaultDuration={slidesDefaultDuration} />
            </div>
          </div>
        )}
        </div>

        {/* Sidepanel */}
        <aside className="space-y-4">
          <div className={panelCard}>
            <TopThree title="Top 3 montørhold – denne uge" entries={top3Teams} />
            <div className="mt-3 border-t border-[#EDE7D8] pt-3">
              <TopThree title={`Montørhold – ${monthLabel}`} entries={top3TeamsMonth} />
            </div>
          </div>
          <div className={panelCard}>
            <TopThree title="Top 3 elektrikere – denne uge" entries={top3Electricians} />
            <div className="mt-3 border-t border-[#EDE7D8] pt-3">
              <TopThree title={`Elektrikere – ${monthLabel}`} entries={top3ElectriciansMonth} />
            </div>
          </div>
          <div className={panelCard}>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-[#26215C] mb-2">
              Tilbagekørsel <span className="text-[#888780] normal-case font-semibold">(mål ≤ {goal.goalPct}%)</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-[#5F5E5A]">Denne uge</span>
              <span className={`font-display text-2xl font-extrabold tabular-nums ${weekReturn.ok ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
                {weekReturn.pct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm mt-1">
              <span className="text-[#5F5E5A]">{monthName[0].toUpperCase() + monthName.slice(1)}</span>
              <span className={`font-display text-2xl font-extrabold tabular-nums ${goal.ok ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
                {goal.pct}%
              </span>
            </div>
            <div className="text-xs text-[#888780] mt-0.5">
              {goal.returned} tilbagekørsler i {monthName} ({goal.total} sager) – tælles den dag de registreres
            </div>

            <div className="mt-3 border-t border-[#EDE7D8] pt-2">
              <div className="text-[13px] font-extrabold uppercase tracking-widest text-[#26215C] mb-2">
                Sygefravær <span className="text-[#888780] normal-case font-semibold">(mål ≤ {goals.sickPct}%)</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-[#5F5E5A]">Denne uge</span>
                <span className={`font-display text-2xl font-extrabold tabular-nums ${weekAbsence.syg.pct <= goals.sickPct ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
                  {weekAbsence.syg.pct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-sm mt-1">
                <span className="text-[#5F5E5A]">{monthName[0].toUpperCase() + monthName.slice(1)}</span>
                <span className={`font-display text-2xl font-extrabold tabular-nums ${monthAbsence.syg.pct <= goals.sickPct ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
                  {monthAbsence.syg.pct}%
                </span>
              </div>
              <div className="text-xs text-[#888780] mt-0.5">
                {monthAbsence.syg.hours} sygetimer af {monthAbsence.netPossible} mulige (efter ferie)
              </div>
            </div>
          </div>
          <div className={panelCard}>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-[#185FA5] mb-2">
              🏖 Ferie / fri
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-[#5F5E5A]">Denne uge</span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-[#185FA5]">
                {weekAbsence.ferie.pct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm mt-1">
              <span className="text-[#5F5E5A]">
                {monthName[0].toUpperCase() + monthName.slice(1)}
              </span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-[#185FA5]">
                {monthAbsence.ferie.pct}%
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-[#888780]">
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
          <div className="mt-4 rounded-2xl border border-[#E7E1D2] bg-white px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] font-extrabold uppercase tracking-widest text-[#26215C]">
                Omsætning · {monthName[0].toUpperCase() + monthName.slice(1)}
              </span>
              <span className="text-sm text-[#5F5E5A]">
                <span className={`num-glow font-display text-2xl font-extrabold tabular-nums ${done ? "text-[#3B6D11]" : ahead ? "text-[#639922]" : "text-[#BA7517]"}`}>
                  {fmt(revenue.current)} kr
                </span>
                <span className="text-[#888780]"> af {fmt(revenue.goal)} kr · </span>
                <span className={`font-bold tabular-nums ${done ? "text-[#3B6D11]" : ahead ? "text-[#639922]" : "text-[#BA7517]"}`}>
                  {rawPct}%
                </span>
                {done && " 🎉 Mål nået!"}
              </span>
            </div>
            <div className="relative h-5 overflow-hidden rounded-full border border-transparent bg-[#F1EFE8]">
              <div
                className={`bar-shine h-full rounded-full transition-all ${
                  done
                    ? "bg-[#97C459]"
                    : ahead
                      ? "bg-[#EF9F27]"
                      : "bg-[#E24B4A]"
                }`}
                style={{ width: `${pct}%`, boxShadow: "none" }}
              />
              {/* Markoer: her burde vi vaere i dag */}
              <div
                className="absolute top-0 h-full w-0.5 bg-[#26215C]"
                style={{ left: `${expectedPct}%` }}
                title="Forventet i dag"
              />
            </div>
            <div className="relative mt-1 h-4 text-[10px] text-[#888780]">
              <span className="absolute -translate-x-1/2" style={{ left: `${expectedPct}%` }}>
                ▲ forventet i dag ({expectedPct}%)
              </span>
            </div>
          </div>
        );
      })()}


    </main>
  );
}
