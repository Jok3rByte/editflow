"use client";

import { Check } from "lucide-react";
import { COLOR_PALETTE } from "@/lib/preview/team-data";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Elegir color ${color}`}
          className="flex size-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110"
          style={{ backgroundColor: color, ...( { "--tw-ring-color": value === color ? color : "transparent" } as React.CSSProperties) }}
        >
          {value === color && <Check className="size-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
