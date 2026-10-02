"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DatePickerFieldProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  className?: string;
  align?: "start" | "end";
  disabled?: boolean;
}

// No usa Popover/Portal de Radix a propósito: este campo se usa dentro de un
// Dialog, y un Popover portado a document.body dentro de un Dialog modal
// (focus trap + su propio portal) puede quedar sin mostrarse. Con un
// dropdown propio, posicionado en el mismo árbol del Dialog, siempre se ve.
export function DatePickerField({ value, onChange, className, align = "start", disabled = false }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        className={cn(
          "w-full justify-start gap-1.5 font-normal",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="size-3.5" />
        {value ? format(value, "dd/MM/yyyy", { locale: es }) : "Elegir fecha"}
      </Button>
      {open && !disabled && (
        <div
          className={cn(
            "absolute top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-popover shadow-md ring-1 ring-foreground/10",
            align === "start" ? "left-0" : "right-0",
          )}
        >
          <Calendar
            mode="single"
            selected={value}
            locale={es}
            onSelect={(date) => {
              if (!date) return;
              onChange(date);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
