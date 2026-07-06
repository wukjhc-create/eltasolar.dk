import { getWeekData } from "@/lib/db";
import { mondayFromParam, weekDays, toISODate, addDays, isoWeek } from "@/lib/dates";
import BoardGrid from "@/components/BoardGrid";
import Legend from "@/components/Legend";
import WeekNav from "@/components/WeekNav";

export const dynamic = "force-dynamic";

export default async function CalendarAdmin({ searchParams }) {
  const monday = mondayFromParam(searchParams?.uge);
  const days = weekDays(monday);
  const fromISO = toISODate(monday);
  const toISO = toISODate(addDays(monday, 4));
  const { teams, employees, tasks, absences } = await getWeekData(fromISO, toISO);

  return (
    <main>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Kalender · Uge {isoWeek(monday)}
        </h1>
        <WeekNav basePath="/admin/kalender" monday={monday} />
      </div>

      <BoardGrid
        teams={teams}
        employees={employees}
        tasks={tasks}
        absences={absences}
        days={days}
        mode="admin"
        weekParam={fromISO}
      />

      <div className="card mt-4 px-4 py-3 flex items-center justify-between">
        <Legend />
        <span className="text-xs text-slate-400">
          Farveprikkerne sætter status på HELE sagen (alle mand, alle dage) · klik på kortet for detaljer
        </span>
      </div>
    </main>
  );
}
