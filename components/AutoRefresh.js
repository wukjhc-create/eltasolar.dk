"use client";

import { useEffect, useRef } from "react";

// Hurtigt lag: opdager aendringer inden for ~15 sek. og genindlaeser hele siden.
// Haerdet mod browser-throttling: bruger baade interval, synligheds-skift og
// et tidsstempel-tjek, saa en "sovende" fane indhenter det forsoemte, naar den vaagner.
// Bundlinjen sikres uanset af HTTP Refresh-headeren (genindlaesning hvert 5. min).
export default function AutoRefresh({ seconds = 15, fullEverySeconds = 540 }) {
  const lastVersion = useRef(null);
  const loadedAt = useRef(Date.now());
  const checking = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        // Absolut sikkerhedsnet i JS-laget (foer HTTP-headerens 5 min.)
        if (Date.now() - loadedAt.current > fullEverySeconds * 1000) {
          window.location.reload();
          return;
        }
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        const { v } = await res.json();
        if (lastVersion.current === null) {
          lastVersion.current = v;
        } else if (v !== lastVersion.current) {
          window.location.reload();
          return;
        }
      } catch {
        // netvaerksfejl: proev igen naeste gang
      } finally {
        checking.current = false;
      }
    };

    const id = setInterval(check, seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    check();

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [seconds, fullEverySeconds]);

  return null;
}
