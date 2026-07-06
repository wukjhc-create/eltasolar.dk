export const STATUSES = {
  planlagt: {
    label: "Planlagt",
    desc: null,
    chip: "bg-zinc-100 text-zinc-800 border-zinc-300 border-l-4 border-l-zinc-400",
    dot: "bg-zinc-400",
  },
  i_gang: {
    label: "I gang",
    desc: null,
    chip: "bg-blue-50 text-blue-900 border-blue-300 border-l-4 border-l-blue-500",
    dot: "bg-blue-500",
  },
  lukket: {
    label: "Lukket",
    desc: "klar til faktura",
    chip: "bg-green-50 text-green-900 border-green-300 border-l-4 border-l-green-500",
    dot: "bg-green-500",
  },
  tilbage: {
    label: "Tilbage",
    desc: "tilbagekørsel",
    chip: "bg-red-50 text-red-900 border-red-300 border-l-4 border-l-red-500",
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
