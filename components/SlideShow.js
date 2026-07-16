"use client";

import { useEffect, useMemo, useState } from "react";

// ELTA Standard: automatisk diasshow paa tavlen.
// Bloed overgang, individuel visningstid, loop, prioriterede slides vises dobbelt.

const BG = {
  solskin: { background: "#FFFFFF" },
  blaek: { background: "#26215C" },
  solgul: { background: "#EF9F27" },
  groen: { background: "#97C459" },
  gradient_sol: { background: "linear-gradient(135deg, #FFFDF7 0%, #F7D391 100%)" },
  gradient_blaek: { background: "linear-gradient(135deg, #26215C 0%, #5B4B9E 100%)" },
};

export default function SlideShow({ slides, defaultDuration = 15 }) {
  // Rotationsliste: vigtige slides (priority 2) indgaar to gange
  const rotation = useMemo(() => {
    const list = [];
    for (const s of slides) {
      list.push(s);
      if (s.priority === 2) list.push(s);
    }
    return list;
  }, [slides]);

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = rotation[index % rotation.length];

  useEffect(() => {
    if (rotation.length <= 1) return;
    const seconds = Math.max(current?.display_duration || defaultDuration, 3);
    const t1 = setTimeout(() => setVisible(false), seconds * 1000 - 600);
    const t2 = setTimeout(() => {
      setIndex((i) => (i + 1) % rotation.length);
      setVisible(true);
    }, seconds * 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [index, rotation, current, defaultDuration]);

  if (!current) return null;

  const dark = current.text_color === "lys";
  const center = current.text_alignment === "center";
  const bgStyle =
    current.background_type === "billede" && current.background_image_url
      ? {
          backgroundImage: `url(${current.background_image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : BG[current.background_type] || BG.solskin;

  const bullets = String(current.bullet_points || "")
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const ink = dark ? "#FAF6EC" : "#26215C";
  const soft = dark ? "rgba(250,246,236,0.75)" : "#5F5E5A";

  // Antal UNIKKE slides til indikatoren
  const uniqueCount = slides.length;
  const uniqueIndex = slides.findIndex((s) => s.id === current.id);

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      {current.background_type === "billede" && (
        <div
          className="absolute inset-0"
          style={{ background: dark ? "rgba(15,12,40,0.55)" : "rgba(255,253,247,0.75)" }}
        />
      )}
      <div
        className={`relative flex h-full flex-col justify-center px-10 py-6 transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        } ${center ? "items-center text-center" : "items-start text-left"}`}
        style={{ color: ink }}
      >
        <div className="flex items-center gap-3">
          {current.icon && <span className="text-4xl leading-none">{current.icon}</span>}
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
            style={{ background: dark ? "rgba(250,246,236,0.15)" : "rgba(38,33,92,0.08)", color: soft }}
          >
            {current.category}
          </span>
        </div>

        <h2 className="font-display mt-3 max-w-5xl text-4xl font-extrabold leading-tight tracking-tight">
          {current.title}
        </h2>
        {current.subtitle && (
          <p className="mt-2 max-w-4xl text-xl font-semibold" style={{ color: soft }}>
            {current.subtitle}
          </p>
        )}
        {current.body && (
          <p className="mt-2 max-w-4xl text-lg" style={{ color: soft }}>
            {current.body}
          </p>
        )}

        {bullets.length > 0 && (
          <ul
            className={`mt-4 grid max-w-5xl gap-x-10 gap-y-2 text-lg font-medium ${
              bullets.length > 4 ? "grid-cols-2" : "grid-cols-1"
            } ${center ? "text-left" : ""}`}
          >
            {bullets.slice(0, 8).map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: dark ? "#F7D391" : "#EF9F27" }}>☀</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {current.footer_text && (
          <p className="font-display mt-5 text-xl font-extrabold italic">“{current.footer_text}”</p>
        )}

        {current.image_url && current.background_type !== "billede" && (
          <img
            src={current.image_url}
            alt=""
            className="absolute bottom-6 right-8 hidden max-h-[45%] max-w-[26%] rounded-xl object-cover shadow-lg lg:block"
          />
        )}
      </div>

      {/* Diskret indikator */}
      {uniqueCount > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {Array.from({ length: uniqueCount }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === uniqueIndex ? 18 : 6,
                background: i === uniqueIndex ? (dark ? "#F7D391" : "#EF9F27") : dark ? "rgba(250,246,236,0.35)" : "rgba(38,33,92,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
