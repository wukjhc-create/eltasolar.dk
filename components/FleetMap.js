"use client";

import { useEffect, useRef } from "react";

// Farver: Bil 1-4 (montoerhold) foelger holdfarverne, resten elektriker-gul
const COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316"];
const colorFor = (car) =>
  car.bilNo != null && car.bilNo >= 1 && car.bilNo <= 4 ? COLORS[car.bilNo - 1] : "#eab308";

// showNames: kun i admin (bag login). Paa tavlen vises udelukkende Bil-numre.
// reloadSeconds: kun paa admin-siden; tavlen har sin egen opdaterings-cyklus.
export default function FleetMap({
  cars,
  dark = false,
  showNames = false,
  reloadSeconds = 0,
  height = 540,
}) {
  const holder = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      const L = window.L;
      if (!L || !holder.current) return;
      // Udsnit: Fyn - Sjaelland - Lolland-Falster
      const map = L.map(holder.current, {
        zoomControl: !dark,
        attributionControl: false,
      }).setView([55.35, 11.4], 8);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

      const bounds = [];
      for (const car of cars) {
        if (!Number.isFinite(car.lat) || !Number.isFinite(car.lng)) continue;
        const label = car.bilNo != null ? `Bil ${car.bilNo}` : showNames ? car.name : null;
        if (!label) continue; // paa tavlen vises kun biler med Bil-nummer
        const color = colorFor(car);
        const marker = L.circleMarker([car.lat, car.lng], {
          radius: dark ? 10 : 9,
          color,
          weight: 3,
          fillColor: color,
          fillOpacity: car.moving ? 0.9 : 0.55,
        }).addTo(map);
        marker.bindTooltip(label, {
          permanent: true,
          direction: "right",
          offset: [10, 0],
          className: dark ? "fleet-label-dark" : "",
        });
        marker.bindPopup(
          `<strong>${label}</strong>${showNames ? ` (${car.name})` : ""}<br/>` +
            `${car.moving ? "🚗 I bevægelse / lige ankommet" : "⏸ Holder"}` +
            `${showNames && car.address ? `<br/>${car.address}` : ""}` +
            `${car.caseNumber ? `<br/>Seneste sag: ${car.caseNumber}` : ""}`
        );
        bounds.push([car.lat, car.lng]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
    };
    document.head.appendChild(script);

    if (reloadSeconds > 0) {
      const id = setTimeout(() => window.location.reload(), reloadSeconds * 1000);
      return () => clearTimeout(id);
    }
  }, [cars, dark, showNames, reloadSeconds]);

  return (
    <div
      ref={holder}
      className={`w-full rounded-lg ${dark ? "map-dark border border-slate-800" : "border border-slate-200"}`}
      style={{ height }}
    />
  );
}
