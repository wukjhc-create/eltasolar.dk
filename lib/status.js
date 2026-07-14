export const STATUSES = {
  planlagt: {
    label: "Planlagt",
    desc: null,
    chip: "bg-zinc-100 text-zinc-800 border-zinc-300 border-l-4 border-l-zinc-400",
    chipDark: "bg-slate-800/80 text-slate-200 border-slate-600 border-l-4 border-l-slate-400",
    chipSun: "bg-[#F1EFE8] text-[#444441]",
    dot: "bg-zinc-400",
  },
  i_gang: {
    label: "I gang",
    desc: null,
    chip: "bg-blue-50 text-blue-900 border-blue-300 border-l-4 border-l-blue-500",
    chipDark: "bg-blue-950/70 text-blue-100 border-blue-700 border-l-4 border-l-blue-400",
    chipSun: "bg-[#E6F1FB] text-[#0C447C]",
    dot: "bg-blue-500",
  },
  lukket: {
    label: "Lukket",
    desc: "klar til faktura",
    chip: "bg-green-50 text-green-900 border-green-300 border-l-4 border-l-green-500",
    chipDark: "bg-green-950/70 text-green-100 border-green-700 border-l-4 border-l-green-400",
    chipSun: "bg-[#97C459] text-[#173404]",
    dot: "bg-green-500",
  },
  tilbage: {
    label: "Tilbage",
    desc: "tilbagekørsel",
    chip: "bg-red-50 text-red-900 border-red-300 border-l-4 border-l-red-500",
    chipDark: "bg-red-950/80 text-red-100 border-red-700 border-l-4 border-l-red-400",
    chipSun: "chip-stripes text-[#501313]",
    dot: "bg-red-500",
  },
};

export const STATUS_ORDER = ["planlagt", "i_gang", "lukket", "tilbage"];

export const RETURN_REASONS = [
  "Materialer",
  "Montage",
  "Elektriker",
  "Kunde/adgang",
  "Vejr",
  "Planlægning",
  "Andet",
];

export const ROLES = ["Montør", "Elektriker", "Lærling", "Kontor", "Indlejet", "Andet"];

// Farver til grupper af medarbejdere uden hold (grupperes efter rolle)
export const ROLE_GROUP = {
  "Elektriker": { name: "Elektrikere", color: "#eab308" },
  "Montør": { name: "Montører", color: "#94a3b8" },
  "Lærling": { name: "Lærlinge", color: "#94a3b8" },
};
