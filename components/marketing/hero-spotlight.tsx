"use client";

import { useEffect, useRef } from "react";

// Glow que sigue al cursor por todo el viewport — la única pieza del Home
// que reacciona directamente al mouse, en vez de solo animar en loop.
// Muta el estilo por ref (sin setState) para no re-renderizar en cada
// mousemove.
export function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      const xPct = (e.clientX / window.innerWidth) * 100;
      const yPct = (e.clientY / window.innerHeight) * 100;
      el.style.setProperty("--mx", `${xPct}%`);
      el.style.setProperty("--my", `${yPct}%`);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 opacity-70 transition-opacity"
      style={{
        background:
          "radial-gradient(640px circle at var(--mx, 50%) var(--my, 25%), color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)",
      }}
    />
  );
}
