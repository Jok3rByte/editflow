import Link from "next/link";
import {
  ArrowRight,
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
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Vista previa interactiva",
  description:
    "Explora los módulos de EditFlow en vivo: dashboard, clientes, monitoreo en tabla y Kanban, calendario y métricas.",
  path: "/preview",
});

const PANELES = [
  { href: "/preview/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "KPIs del mes, alertas y accesos rápidos." },
  { href: "/preview/clientes", label: "Clientes", icon: Users, desc: "Progreso de meta por cliente, en tarjetas." },
  { href: "/preview/monitoreo", label: "Monitoreo", icon: ClipboardList, desc: "La tabla de videos, en modo Tabla y Kanban." },
  { href: "/preview/calendario", label: "Calendario", icon: CalendarDays, desc: "Reuniones, grabaciones y entregas del mes." },
  { href: "/preview/metricas", label: "Métricas", icon: LineChart, desc: "Gráficas reales con Recharts sobre datos del seed." },
  { href: "/preview/equipo", label: "Equipo", icon: UsersRound, desc: "Miembros de Productora Lean y sus roles." },
  { href: "/preview/configuracion", label: "Configuración", icon: Settings, desc: "Organización, periodos y zona de riesgo." },
];

export default function PreviewIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-mesh pointer-events-none fixed inset-0 opacity-40" />
      <div className="bg-grid pointer-events-none fixed inset-0 opacity-[0.15]" />

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            Edit<span className="text-gradient">Flow</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs font-medium text-primary">
          <Eye className="size-3.5" />
          MODO VISTA PREVIA
        </div>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Todos los paneles, sin base de datos
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Cada panel usa los números exactos del seed de Productora Lean (sección 13 del brief).
          Es solo para revisar diseño — nada aquí está conectado a Supabase todavía.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PANELES.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/0 blur-2xl transition-all group-hover:bg-primary/25" />
              <div className="relative flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 text-primary ring-1 ring-primary/30">
                  <Icon className="size-5" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <h3 className="relative mt-4 font-heading font-semibold">{label}</h3>
              <p className="relative mt-1 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-border/60 pt-8 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← Volver al Home
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/crear-espacio" className="text-primary hover:underline">
            Crear tu espacio real
          </Link>
        </div>
      </div>
    </div>
  );
}
