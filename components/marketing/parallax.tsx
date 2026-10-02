"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Desplaza el contenido verticalmente en proporción al scroll (capas a
// distinta velocidad = sensación de profundidad), usado en los elementos
// ambientales de fondo del Home.
export function Parallax({
  children,
  speed = 0.15,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
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
      setOffset(centerOffset * speed);
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
  }, [speed]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)} style={{ transform: `translateY(${offset}px)` }}>
      {children}
    </div>
  );
}
