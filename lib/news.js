// Tidsstyring af nyheder: hvert opslag kan begraenses til ugedage og klokkeslaet.
// Tavlen genindlaeser mindst hvert 5. minut, saa skift i sendeskemaet slaar
// automatisk igennem uden nogen roerer noget.

// Nuvaerende tidspunkt i dansk tid: { isoDay: 1-7 (man-soen), minutes: 0-1439 }
export function nowInCopenhagen() {
  const s = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Copenhagen" });
  const [datePart, timePart] = s.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0 = soendag
  return { isoDay: jsDay === 0 ? 7 : jsDay, minutes: hh * 60 + mm };
}

function toMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

// Skal opslaget vises lige nu?
export function isNewsVisible(n, now = nowInCopenhagen()) {
  if (!n.active) return false;
  if (n.days) {
    const allowed = n.days.split(",").map((x) => parseInt(x, 10));
    if (!allowed.includes(now.isoDay)) return false;
  }
  const start = toMinutes(n.start_time);
  const stop = toMinutes(n.stop_time);
  if (start === null && stop === null) return true;
  const from = start ?? 0;
  const to = stop ?? 24 * 60;
  if (from <= to) return now.minutes >= from && now.minutes < to;
  // Tidsrum hen over midnat, fx 22:00-06:00
  return now.minutes >= from || now.minutes < to;
}

// De tre kanaler paa tavlen - navne og farver aendres KUN her
export const NEWS_CATEGORIES = {
  breaking: {
    label: "Breaking",
    icon: "🔴",
    badge: "breaking-stripes text-white",
    bar: "border-red-500/70 breaking-bar",
    text: "font-bold text-red-300",
    adminBadge: "bg-red-600 text-white",
    hint: "Haster – rød og pulserer",
  },
  opslag: {
    label: "Opslagstavlen",
    icon: "📌",
    badge: "opslag-badge text-cyan-50",
    bar: "opslag-bar",
    text: "text-slate-100",
    adminBadge: "bg-cyan-600 text-white",
    hint: "Praktiske beskeder",
  },
  ros: {
    label: "Ros & fejring",
    icon: "🎉",
    badge: "ros-badge",
    bar: "ros-bar",
    text: "ros-text font-semibold text-amber-200",
    adminBadge: "bg-amber-500 text-white",
    hint: "Skulderklap, fødselsdage, sejre",
  },
};
export const CATEGORY_ORDER = ["breaking", "opslag", "ros"];

export const DAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

// Laesbar beskrivelse af sendeskemaet til admin-listen
export function scheduleLabel(n) {
  const parts = [];
  if (n.days) {
    const nums = n.days.split(",").map((x) => parseInt(x, 10));
    if (nums.length < 7) parts.push(nums.map((d) => DAY_LABELS[d - 1]).join(", "));
  }
  if (n.start_time || n.stop_time) {
    parts.push(`${n.start_time || "00:00"}–${n.stop_time || "24:00"}`);
  }
  return parts.length ? parts.join(" · ") : "Altid";
}
