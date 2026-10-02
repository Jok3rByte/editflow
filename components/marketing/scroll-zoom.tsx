"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SCALE_MIN = 0.94;
const SCALE_MAX = 1;

// Zoom suave ligado al scroll: la imagen entra un poco "encogida" y se
// acerca a su tamaño real a medida que su centro se acerca al centro de la
// pantalla — un efecto de profundidad continuo, no una animación de una
// sola vez como Reveal.
export function ScrollZoom({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(SCALE_MIN);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      rafRef.current = 0;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const centerOffset = rect.top + rect.height / 2 - vh / 2;
      const progress = 1 - Math.min(1, Math.abs(centerOffset) / (vh * 0.7));
      setScale(SCALE_MIN + Math.max(0, progress) * (SCALE_MAX - SCALE_MIN));
    }

    function onScroll() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{ transform: `scale(${scale})`, transition: "transform 0.15s ease-out" }}
    >
      {children}
    </div>
  );
}
