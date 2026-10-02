"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

interface TimePickerFieldProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

// Estilo "reloj digital": dos columnas desplazables (hora / minuto) en
// fuente monoespaciada, sin depender de Popover/Portal por la misma razón
// que DatePickerField — evita el conflicto con el Dialog que lo contiene.
export function TimePickerField({ value, onChange, className, disabled = false }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hh, mm] = value.split(":");

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn("w-full justify-start gap-1.5 font-mono tabular-nums", className)}
      >
        <Clock className="size-3.5" />
        {value}
      </Button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 flex gap-2 rounded-lg border border-border bg-popover p-2.5 shadow-md ring-1 ring-foreground/10">
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hora</span>
            <div className="h-40 w-12 overflow-y-auto rounded-md border border-border/60">
              {HORAS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onChange(`${h}:${mm}`)}
                  className={cn(
                    "w-full py-1.5 text-center font-mono text-sm tabular-nums transition-colors hover:bg-primary/10",
                    h === hh && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end pb-1 font-mono text-lg text-muted-foreground">:</div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Min</span>
            <div className="h-40 w-12 overflow-y-auto rounded-md border border-border/60">
              {MINUTOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange(`${hh}:${m}`)}
                  className={cn(
                    "w-full py-1.5 text-center font-mono text-sm tabular-nums transition-colors hover:bg-primary/10",
                    m === mm && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
