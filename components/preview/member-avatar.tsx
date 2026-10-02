import { initials } from "@/lib/preview/team-data";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  nombre: string;
  color?: string;
  foto?: string;
  icono?: string;
  className?: string; // tamaño, ej. "size-4"
  textClassName?: string; // tamaño de las iniciales, ej. "text-[8px]"
}

// Representación visual compartida de una persona en toda la app: foto si
// hay una, si no el ícono elegido, si no las iniciales sobre su color. Se
// usa en Equipo, Monitoreo, Calendario y Clientes para que cambiar la foto,
// el ícono o el color en Equipo se refleje en todos lados sin duplicar UI.
export function MemberAvatar({
  nombre,
  color,
  foto,
  icono,
  className = "size-4",
  textClassName = "text-[8px]",
}: MemberAvatarProps) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar en base64, no vale la pena next/image
      <img
        src={foto}
        alt={nombre}
        title={nombre}
        className={cn(className, "shrink-0 rounded-full object-cover")}
      />
    );
  }

  if (icono) {
    return (
      <span
        className={cn(className, "flex shrink-0 items-center justify-center rounded-full leading-none")}
        style={{ backgroundColor: color }}
        title={nombre}
      >
        {icono}
      </span>
    );
  }

  if (!color) return null;

  return (
    <span
      className={cn(className, "flex shrink-0 items-center justify-center rounded-full font-bold text-white", textClassName)}
      style={{ backgroundColor: color }}
      title={nombre}
    >
      {initials(nombre)}
    </span>
  );
}
