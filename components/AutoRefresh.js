"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Sparer datatrafik: poller kun en lille dataversion hvert X sekund og
// genindlaeser foerst tavlen, naar noget faktisk har aendret sig.
// Som sikkerhedsnet genindlaeses der altid mindst hvert 10. minut.
export default function AutoRefresh({ seconds = 15, fullEverySeconds = 600 }) {
  const router = useRouter();
  const lastVersion = useRef(null);
  const lastFull = useRef(Date.now());

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { v } = await res.json();
        if (lastVersion.current === null) {
          lastVersion.current = v;
        } else if (v !== lastVersion.current) {
          lastVersion.current = v;
          lastFull.current = Date.now();
          router.refresh();
        } else if (Date.now() - lastFull.current > fullEverySeconds * 1000) {
          lastFull.current = Date.now();
          router.refresh();
        }
      } catch {
        // netvaerksfejl: proev igen naeste gang
      }
    };
    const id = setInterval(tick, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds, fullEverySeconds]);

  return null;
}
