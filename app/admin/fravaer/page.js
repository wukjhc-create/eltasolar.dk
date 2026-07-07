import { getWeekData } from "@/lib/db";
import { mondayFromParam, weekDays, toISODate, addDays, isoWeek, DAY_NAMES, formatDayShort } from "@/lib/dates";
import { absencePct } from "@/lib/stats";
import WeekNav from "@/components/WeekNav";
import { toggleAbsence, registerAbsence } from "./actions";

export const dynamic = "force-dynamic";

export default async function AbsencePage({ searchParams }) {
  const monday = mondayFromParam(searchParams?.uge);
  const days = weekDays(monday);
  const fromISO = toISODate(monday);
  const toISO = toISODate(addDays(monday, 4));
  const { employees, absences } = await getWeekData(fromISO, toISO);

  const activeEmployees = employees.filter((e) => e.active);
  const absence = absencePct(absences, employees, 5);
  const find = (empId, iso) =>
    absences.find((a) => a.employee_id === empId && a.date === iso);
  const empHours = (empId) =>
    absences
      .filter((a) => a.employee_id === empId)
      .reduce((s, a) => s + Number(a.hours || 0), 0);

  return (
    <main>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Fravær · Uge {isoWeek(monday)}
        </h1>
        <WeekNav basePath="/admin/fravaer" monday={monday} />
      </div>

      <div className="grid grid-cols-[1fr_20rem] gap-5 items-start">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 w-44">Medarbejder</th>
                {days.map((d, i) => (
                  <th key={i} className="px-2 py-2.5 text-center">
                    {DAY_NAMES[i].slice(0, 3)}
                    <span className="block font-normal text-slate-400">{formatDayShort(d)}</span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right">Timer</th>
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-semibold text-slate-800">{emp.name}</td>
                  {days.map((d, di) => {
                    const iso = toISODate(d);
                    const a = find(emp.id, iso);
                    return (
                      <td key={di} className="px-2 py-2 text-center">
                        <form action={toggleAbsence}>
                          <input type="hidden" name="employee_id" value={emp.id} />
                          <input type="hidden" name="date" value={iso} />
                          <button
                            className={`h-8 w-14 rounded border text-xs font-semibold transition-colors ${
                              a
                                ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-200"
                                : "border-slate-200 bg-white text-slate-300 hover:border-slate-400 hover:text-slate-500"
                            }`}
                            title={a ? `${a.hours} timer (${a.reason || "Fravær"}) – klik for at fjerne` : "Markér fravær"}
                          >
                            {a ? Number(a.hours) : "–"}
                          </button>
                        </form>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {empHours(emp.id) || ""}
                  </td>
                </tr>
              ))}
              {activeEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Ingen aktive medarbejdere.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sygefravær denne uge
            </div>
            <div className="font-display text-4xl font-extrabold tabular-nums mt-1">
              {absence.syg.pct}%
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {absence.syg.hours} sygetimer af {absence.netPossible} mulige arbejdstimer
              (brutto {absence.possible} minus ferie/fri {absence.ferie.hours} og andet {absence.andet.hours})
            </p>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Sygdom</span>
                <span className="tabular-nums font-semibold">{absence.syg.hours} t · {absence.syg.pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Ferie/fri</span>
                <span className="tabular-nums font-semibold">{absence.ferie.hours} t · {absence.ferie.pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Andet</span>
                <span className="tabular-nums font-semibold">{absence.andet.hours} t · {absence.andet.pct}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              På tavlen vises kun denne samlede procent – aldrig fravær pr. medarbejder.
            </p>
          </div>

          <form action={registerAbsence} className="card p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Registrér med andet timetal
            </div>
            <div>
              <label className="label" htmlFor="fa-emp">Medarbejder</label>
              <select id="fa-emp" name="employee_id" required className="input" defaultValue="">
                <option value="" disabled>Vælg</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="fa-date">Dato</label>
                <input id="fa-date" name="date" type="date" required defaultValue={fromISO} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="fa-hours">Timer</label>
                <input id="fa-hours" name="hours" type="number" step="0.5" min="0" defaultValue={7.5} className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="fa-reason">Årsag (valgfri)</label>
              <input id="fa-reason" name="reason" className="input" placeholder="fx sygdom, ferie" />
            </div>
            <button className="btn-primary w-full justify-center">Gem fravær</button>
          </form>
        </aside>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Klik på en dag for at markere SYGDOM med medarbejderens standardtimer (klik igen for at fjerne). Ferie/fri hentes automatisk fra Ordrestyring - eller registreres med formularen med årsagen "ferie".
      </p>
    </main>
  );
}
