"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Entrada más "moderna" que Reveal (fade + slide simple): combina blur,
// escala y desplazamiento en una sola curva de salida marcada — pensada
// para tarjetas, no para bloques de texto largos.
export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        "transition-[opacity,transform,filter]",
        visible ? "translate-y-0 scale-100 opacity-100 blur-none" : "translate-y-10 scale-[0.94] opacity-0 blur-md",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
