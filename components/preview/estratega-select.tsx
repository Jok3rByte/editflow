"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { MemberAvatar } from "@/components/preview/member-avatar";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import {
  MIEMBROS_INICIALES,
  PREVIEW_EQUIPO_KEY,
  type Miembro,
} from "@/lib/preview/team-data";
import { cn } from "@/lib/utils";

// Sin estratega dedicado asignado — el cliente lo maneja la productora
// directamente. Coincide con el valor por defecto usado en el seed.
export const SIN_ESTRATEGA = "Productora";

function EstrategaBadge({ nombre, miembro }: { nombre: string; miembro?: Miembro }) {
  if (nombre === SIN_ESTRATEGA || !miembro) {
    return <span className="truncate">{nombre || SIN_ESTRATEGA}</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <MemberAvatar
        nombre={nombre}
        color={miembro.color}
        foto={miembro.foto}
        icono={miembro.icono}
        className="size-4"
        textClassName="text-[8px]"
      />
      <span className="truncate">{nombre}</span>
    </span>
  );
}

// Selector de Estratega para el brief del cliente: solo lista a los
// miembros del equipo invitados con rol "viewer" (Estratega). Al elegir
// uno, el color que se le asignó en Equipo se muestra aquí también, y como
// el nombre se guarda en el mismo campo `encargado` del cliente, cualquier
// otra vista que lo lea (la tarjeta en Clientes, etc.) queda actualizada
// automáticamente sin duplicar datos.
export function EstrategaSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (nombre: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [miembros] = useLocalStorageState<Miembro[]>(PREVIEW_EQUIPO_KEY, MIEMBROS_INICIALES);
  const estrategas = miembros.filter((m) => m.rol === "viewer");
  const miembroPorNombre = new Map(miembros.map((m) => [m.nombre, m]));
  const opciones = [SIN_ESTRATEGA, ...estrategas.map((m) => m.nombre)];

  return (
    <Select value={value || SIN_ESTRATEGA} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <EstrategaBadge nombre={value} miembro={miembroPorNombre.get(value)} />
      </SelectTrigger>
      {/* position="popper": el trigger no usa <SelectValue />, así que el
          modo "item-aligned" (default) no puede calcular su posición. */}
      <SelectContent position="popper">
        {opciones.map((nombre) => (
          <SelectItem key={nombre} value={nombre}>
            <EstrategaBadge nombre={nombre} miembro={miembroPorNombre.get(nombre)} />
          </SelectItem>
        ))}
        {estrategas.length === 0 && (
          <SelectLabel className="max-w-56 text-wrap normal-case">
            Aún no hay estrategas invitados — ve a Equipo para invitar uno.
          </SelectLabel>
        )}
      </SelectContent>
    </Select>
  );
}
