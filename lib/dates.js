export const DAY_NAMES = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMonday(date) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // mandag = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Mandag for den uge et ?uge=YYYY-MM-DD parameter peger paa (default: i dag)
export function mondayFromParam(param) {
  let base = new Date();
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) base = parseISODate(param);
  return getMonday(base);
}

// [mandag..fredag] som Date-objekter
export function weekDays(monday) {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

export function formatDayShort(d) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function formatRange(monday) {
  const friday = addDays(monday, 4);
  return `${formatDayShort(monday)} – ${formatDayShort(friday)} ${friday.getFullYear()}`;
}

// Maanedens interval + antal hverdage (man-fre)
export function monthInfo(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  let workdays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) workdays++;
  }
  return { fromISO: toISODate(start), toISO: toISODate(end), workdays };
}

export const MONTH_NAMES = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];
