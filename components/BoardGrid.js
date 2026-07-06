import Link from "next/link";
import { STATUSES, STATUS_ORDER } from "@/lib/status";
import { DAY_NAMES, toISODate, formatDayShort } from "@/lib/dates";
import { groupForBoard, classifyAbsence } from "@/lib/stats";
import { setTaskStatus } from "@/app/admin/kalender/actions";

const STATUS_RANK = { planlagt: 0, i_gang: 1, lukket: 2, tilbage: 3 };

const THEMES = {
  light: {
    wrap: "card overflow-hidden",
    thead: "bg-slate-900 text-white",
    theadDate: "text-slate-300",
    groupRow: "bg-slate-50 border-t border-slate-200",
    groupText: "text-slate-600",
    row: "border-t border-slate-100",
    cellBorder: "border-l border-slate-100",
    name: "text-slate-800",
    role: "text-slate-400",
    absentCell: "bg-slate-100",
    absentChip: "border-dashed border-slate-300 text-slate-400",
  },
  dark: {
    wrap: "overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60",
    thead: "bg-slate-950 text-white border-b-2 border-cyan-500/60",
    theadDate: "text-slate-500",
    groupRow: "bg-slate-800/50 border-t border-slate-800",
    groupText: "text-slate-300",
    row: "border-t border-slate-800/70",
    cellBorder: "border-l border-slate-800/70",
    name: "text-slate-100",
    role: "text-slate-500",
    absentCell: "",
    absentChip: "border-dashed border-red-600/60 text-red-400",
  },
};

// Fravaerskategorier paa tavlen: syg = roed alarm, ferie = rolig blaa, andet = graa
const ABS_STYLE = {
  syg: "board-absent rounded border border-dashed border-red-600/60 px-1.5 py-[2px] text-[11px] text-red-400",
  ferie: "rounded border border-dashed border-sky-700/70 bg-sky-950/40 px-1.5 py-[2px] text-[11px] text-sky-300/90",
  andet: "rounded border border-dashed border-slate-600/70 px-1.5 py-[2px] text-[11px] text-slate-400",
};
const ABS_ICON = { syg: "⚠", ferie: "🏖", andet: "•" };
const ABS_WORD = { syg: "syg", ferie: "ferie", andet: "fravær" };

/* Kompakt sagskort til tavlen (en linje, pulserer efter status) */
function BoardChip({ task }) {
  const s = STATUSES[task.status] || STATUSES.planlagt;
  const fx =
    task.status === "lukket" ? "board-lukket" : task.status === "tilbage" ? "board-tilbage" : "";
  const text = [task.order_number, task.title].filter(Boolean).join(" ") || "Opgave";
  return (
    <div className={`rounded border px-1.5 py-[3px] leading-tight text-[11.5px] ${s.chip} ${fx}`}>
      <div className="truncate font-semibold">
        {task.status === "lukket" ? "✓ " : ""}
        {text}
        {task.status === "tilbage" && task.return_reason ? ` · ↩ ${task.return_reason}` : ""}
      </div>
    </div>
  );
}

/* Fuldt sagskort til admin (med adresse) */
function AdminChip({ task }) {
  const s = STATUSES[task.status] || STATUSES.planlagt;
  const line1 = [task.order_number, task.title].filter(Boolean).join(" · ");
  return (
    <div className={`rounded border px-1.5 py-1 leading-snug text-xs ${s.chip}`}>
      <div className="font-semibold truncate">{line1 || "Opgave"}</div>
      {task.customer_address && (
        <div className="truncate opacity-80">{task.customer_address}</div>
      )}
      {task.status === "tilbage" && task.return_reason && (
        <div className="truncate font-medium">↩ {task.return_reason}</div>
      )}
    </div>
  );
}

/* Fire farveknapper: et klik saetter status paa HELE sagen (alle mand, alle dage) */
function QuickStatus({ task }) {
  return (
    <form action={setTaskStatus} className="flex items-center gap-1.5 px-0.5 pt-0.5">
      <input type="hidden" name="id" value={task.id} />
      {STATUS_ORDER.map((key) => (
        <button
          key={key}
          type="submit"
          name="status"
          value={key}
          title={`Sæt hele sagen til: ${STATUSES[key].label}`}
          aria-label={`Sæt hele sagen til ${STATUSES[key].label}`}
          className={`h-3.5 w-3.5 rounded-full ${STATUSES[key].dot} transition ${
            task.status === key
              ? "ring-2 ring-slate-500 ring-offset-1"
              : "opacity-35 hover:opacity-100"
          }`}
        />
      ))}
    </form>
  );
}

/* Reducer en celles kort til unikke sager - hoejeste status vinder visningen */
function uniqueCellTasks(tasks) {
  const map = new Map();
  for (const t of tasks) {
    const key = t.order_number || `id:${t.id}`;
    const ex = map.get(key);
    if (!ex || (STATUS_RANK[t.status] ?? 0) > (STATUS_RANK[ex.status] ?? 0)) map.set(key, t);
  }
  return [...map.values()];
}

export default function BoardGrid({ teams, employees, tasks, absences, days, mode, weekParam }) {
  const groups = groupForBoard(employees, teams);
  const isAdmin = mode === "admin";
  const t = THEMES[isAdmin ? "light" : "dark"];

  const tasksForEmp = (empId, iso) =>
    tasks.filter((x) => x.employee_id === empId && x.date === iso);
  const absenceFor = (empId, iso) =>
    absences.find((a) => a.employee_id === empId && a.date === iso) || null;

  if (groups.length === 0) {
    return (
      <div className={`${t.wrap} p-10 text-center ${isAdmin ? "text-slate-500" : "text-slate-400"}`}>
        Ingen medarbejdere på tavlen endnu.
        {isAdmin && (
          <>
            {" "}
            <Link href="/admin/medarbejdere" className="text-blue-600 underline">
              Opret medarbejdere
            </Link>{" "}
            og markér dem som aktive + &quot;vis på tavle&quot;.
          </>
        )}
      </div>
    );
  }

  return (
    <div className={t.wrap}>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className={t.thead}>
            <th className={`px-3 py-2.5 text-left font-display text-sm font-bold uppercase tracking-wide ${isAdmin ? "w-44" : "w-40"}`}>
              {isAdmin ? "Medarbejder" : "Hold"}
            </th>
            {days.map((d, i) => (
              <th key={i} className="px-2 py-2.5 text-left">
                <span className="font-display text-sm font-bold uppercase tracking-wide">
                  {DAY_NAMES[i]}
                </span>
                <span className={`ml-2 text-xs font-normal ${t.theadDate}`}>
                  {formatDayShort(d)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) =>
            isAdmin ? (
              <AdminGroup
                key={group.team.id}
                group={group}
                days={days}
                tasksForEmp={tasksForEmp}
                absenceFor={absenceFor}
                weekParam={weekParam}
                t={t}
              />
            ) : String(group.team.id).startsWith("rolle-") ? (
              // Elektrikere m.fl. uden hold: en raekke pr. person
              <BoardRoleGroup
                key={group.team.id}
                group={group}
                days={days}
                tasksForEmp={tasksForEmp}
                absenceFor={absenceFor}
                t={t}
              />
            ) : (
              // Montoerhold: EN raekke pr. hold - sager vises kun en gang
              <BoardTeamRow
                key={group.team.id}
                group={group}
                days={days}
                tasksForEmp={tasksForEmp}
                absenceFor={absenceFor}
                t={t}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Tavle: en raekke pr. montoerhold ---------- */
function BoardTeamRow({ group, days, tasksForEmp, absenceFor, t }) {
  const color = group.team.color || "#94a3b8";
  const memberIds = group.employees.map((e) => e.id);
  const firstNames = group.employees.map((e) => e.name.split(" ")[0]);

  return (
    <tr className={`${t.row} align-top`}>
      <td className="px-3 py-2" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}88` }}
          />
          <span className={`font-display text-sm font-bold uppercase tracking-wide truncate ${t.name}`}>
            {group.team.name}
          </span>
        </div>
        <div className={`text-xs truncate ${t.role}`}>{firstNames.join(" · ")}</div>
      </td>
      {days.map((d, di) => {
        const iso = toISODate(d);
        const cellTasks = uniqueCellTasks(
          memberIds.flatMap((id) => tasksForEmp(id, iso))
        );
        const absentMembers = group.employees
          .map((e) => ({ name: e.name.split(" ")[0], abs: absenceFor(e.id, iso) }))
          .filter((x) => x.abs);
        return (
          <td key={di} className={`px-1 py-1 ${t.cellBorder}`}>
            <div className="space-y-0.5 min-h-[1.4rem]">
              {absentMembers.map(({ name, abs }) => {
                const cat = classifyAbsence(abs.reason);
                return (
                  <div key={name} className={ABS_STYLE[cat]}>
                    {ABS_ICON[cat]} {name} {ABS_WORD[cat]}
                  </div>
                );
              })}
              {cellTasks.slice(0, 4).map((task) => (
                <BoardChip key={task.id} task={task} />
              ))}
              {cellTasks.length > 4 && (
                <div className="px-1.5 text-[11px] font-semibold text-slate-500">
                  +{cellTasks.length - 4} flere
                </div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

/* ---------- Tavle: elektrikere m.fl. - egen raekke pr. person ---------- */
function BoardRoleGroup({ group, days, tasksForEmp, absenceFor, t }) {
  const color = group.team.color || "#94a3b8";
  return (
    <>
      <tr>
        <td colSpan={days.length + 1} className={t.groupRow}>
          <div className="flex items-center gap-2 px-3 py-1">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
            />
            <span className={`font-display text-xs font-bold uppercase tracking-widest ${t.groupText}`}>
              {group.team.name}
            </span>
          </div>
        </td>
      </tr>
      {group.employees.map((emp) => (
        <tr key={emp.id} className={`${t.row} align-top`}>
          <td className="px-3 py-1" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
            <div className={`font-semibold text-sm truncate ${t.name}`}>{emp.name}</div>
          </td>
          {days.map((d, di) => {
            const iso = toISODate(d);
            const cellTasks = uniqueCellTasks(tasksForEmp(emp.id, iso));
            const abs = absenceFor(emp.id, iso);
            const cat = abs ? classifyAbsence(abs.reason) : null;
            return (
              <td key={di} className={`px-1 py-1 ${t.cellBorder}`}>
                <div className="space-y-0.5 min-h-[1.4rem]">
                  {abs && (
                    <div className={ABS_STYLE[cat]}>
                      {ABS_ICON[cat]} {ABS_WORD[cat][0].toUpperCase() + ABS_WORD[cat].slice(1)}
                    </div>
                  )}
                  {cellTasks.slice(0, 4).map((task) => (
                    <BoardChip key={task.id} task={task} />
                  ))}
                  {cellTasks.length > 4 && (
                    <div className="px-1.5 text-[11px] font-semibold text-slate-500">
                      +{cellTasks.length - 4} flere
                    </div>
                  )}
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/* ---------- Admin: en raekke pr. medarbejder (redigering) ---------- */
function AdminGroup({ group, days, tasksForEmp, absenceFor, weekParam, t }) {
  const color = group.team.color || "#94a3b8";
  return (
    <>
      <tr>
        <td colSpan={days.length + 1} className={t.groupRow}>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className={`font-display text-xs font-bold uppercase tracking-widest ${t.groupText}`}>
              {group.team.name}
            </span>
          </div>
        </td>
      </tr>
      {group.employees.map((emp) => (
        <tr key={emp.id} className={`${t.row} align-top`}>
          <td className="px-3 py-2" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
            <div className={`font-semibold text-sm truncate ${t.name}`}>{emp.name}</div>
            <div className={`text-xs ${t.role}`}>{emp.role}</div>
          </td>
          {days.map((d, di) => {
            const iso = toISODate(d);
            const cellTasks = tasksForEmp(emp.id, iso);
            const absent = !!absenceFor(emp.id, iso);
            return (
              <td key={di} className={`px-1 py-1.5 ${t.cellBorder} ${absent ? t.absentCell : ""}`}>
                <div className="space-y-1 min-h-[2.25rem]">
                  {absent && (
                    <div className={`rounded border px-1.5 py-1 text-xs ${t.absentChip}`}>
                      Fraværende
                    </div>
                  )}
                  {cellTasks.map((task) => (
                    <div key={task.id}>
                      <Link
                        href={`/admin/kalender/opgave/${task.id}?uge=${weekParam}`}
                        className="block hover:opacity-80"
                      >
                        <AdminChip task={task} />
                      </Link>
                      <QuickStatus task={task} />
                    </div>
                  ))}
                  <Link
                    href={`/admin/kalender/ny?dato=${iso}&medarbejder=${emp.id}&uge=${weekParam}`}
                    className="block rounded border border-dashed border-slate-200 px-1.5 py-0.5 text-center text-xs text-slate-300 hover:border-blue-400 hover:text-blue-500"
                    aria-label={`Ny opgave for ${emp.name} ${iso}`}
                  >
                    +
                  </Link>
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
