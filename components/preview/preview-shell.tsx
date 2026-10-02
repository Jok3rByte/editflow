"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Eye,
  LayoutDashboard,
  LineChart,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROL_LABEL, useSessionRole } from "@/lib/preview/session";
import type { Rol } from "@/lib/preview/team-data";

const MODULOS = [
  { href: "/preview/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/preview/clientes", label: "Clientes", icon: Users },
  { href: "/preview/monitoreo", label: "Monitoreo", icon: ClipboardList },
  { href: "/preview/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/preview/metricas", label: "Métricas", icon: LineChart },
];
const SOPORTE = [
  { href: "/preview/equipo", label: "Equipo", icon: UsersRound },
  { href: "/preview/configuracion", label: "Configuración", icon: Settings },
];

export function PreviewShell({
  active,
  header,
  children,
}: {
  active: string;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [rol, setRol] = useSessionRole();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-grid pointer-events-none fixed inset-0 opacity-[0.15]" />

      <div className="relative flex items-center justify-center gap-3 border-b border-border/60 bg-primary/10 py-2 text-center text-xs font-medium text-primary">
        <Eye className="size-3.5" />
        VISTA PREVIA — datos fijos del seed de Productora Lean, sin conexión a Supabase.
        <Link href="/preview" className="underline underline-offset-2 hover:text-foreground">
          Ver todos los paneles
        </Link>
        <ThemeToggle className="absolute right-3 size-6 text-primary hover:bg-primary/15" />
      </div>

      <div className="relative flex">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-card/40 p-3 backdrop-blur lg:block">
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
            <div className="glow-primary flex size-7 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
              E
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-semibold">
                Edit<span className="text-gradient">Flow</span>
              </span>
              <span className="text-xs text-muted-foreground">Productora Lean</span>
            </div>
          </Link>

          <p className="mt-5 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Módulos
          </p>
          <nav className="mt-1 space-y-0.5">
            {MODULOS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active === label
                    ? "bg-primary/15 font-medium text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <p className="mt-5 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Soporte
          </p>
          <nav className="mt-1 space-y-0.5">
            {SOPORTE.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active === label
                    ? "bg-primary/15 font-medium text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 space-y-1.5 border-t border-border/60 px-2 pt-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Viendo como
            </p>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger size="sm" className="w-full">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-cyan/40 font-mono text-[10px] font-medium ring-1 ring-primary/30">
                    {ROL_LABEL[rol].slice(0, 2).toUpperCase()}
                  </span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent position="popper">
                {(Object.keys(ROL_LABEL) as Rol[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROL_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rol === "viewer" && (
              <p className="px-0.5 text-[10px] leading-snug text-muted-foreground">
                Estratega: solo lectura, salvo clientes (puede registrar y editar el brief).
              </p>
            )}
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          {header}
          {children}
        </main>
      </div>
    </div>
  );
}
