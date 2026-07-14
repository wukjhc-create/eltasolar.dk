// Flaaden: udled hver bils sidst kendte position fra seneste GPS-tur.
// Viser status: "koerer/lige ankommet" (slut for < 5 min siden) eller
// "holder ved <adresse> siden <tid>".

import { osTimeToDateISO } from "./ordrestyring";

// "Bil 3" i OS Vehicle-navnet giver automatisk nummer-match med tavlen
function bilNoFromName(name) {
  const m = /bil\s*(\d+)/i.exec(name || "");
  return m ? parseInt(m[1], 10) : null;
}

export function latestByCar(entries) {
  const byCar = new Map();
  for (const e of entries || []) {
    const key = e.car || e.carRegistrationNumber;
    if (!key) continue;
    const stop = Number(e.stopTime || 0);
    const existing = byCar.get(key);
    if (!existing || stop > Number(existing.stopTime || 0)) byCar.set(key, e);
  }

  const nowSec = Date.now() / 1000;
  const cars = [];
  for (const [name, e] of byCar) {
    const point = e.stopPoint || e.startPoint;
    if (!point) continue;
    const minutesSince = Math.max(Math.round((nowSec - Number(e.stopTime)) / 60), 0);
    cars.push({
      name,
      bilNo: bilNoFromName(name),
      reg: e.carRegistrationNumber || null,
      lat: Number(point.latitude),
      lng: Number(point.longitude),
      address: e.stopAddress || e.startAddress || null,
      caseNumber: e.case?.caseNumber || null,
      minutesSince,
      moving: minutesSince < 5,
      lastSeenDate: osTimeToDateISO(e.stopTime),
    });
  }

  cars.sort((a, b) => {
    if (a.bilNo != null && b.bilNo != null) return a.bilNo - b.bilNo;
    if (a.bilNo != null) return -1;
    if (b.bilNo != null) return 1;
    return a.name.localeCompare(b.name, "da");
  });
  return cars;
}

export function formatSince(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} t ${m} m` : `${h} t`;
}
