"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  LineChart,
  Lock,
  Plus,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewShell } from "@/components/preview/preview-shell";

interface Periodo {
  label: string;
  status: "abierto" | "cerrado";
  kpis: {
    clientes_activos: number;
    meta_total: number;
    total_videos: number;
    entregados: number;
    en_edicion: number;
    en_revision: number;
    atrasados: number;
    cumplimiento_global: number;
  };
  entregas: { titulo: string; fecha: string }[];
  alertas: { titulo: string; fecha: string }[];
}

// Números exactos de supabase/seed.sql (sección 13 del brief). Nada inventado.
const PERIODOS: Record<"octubre" | "noviembre", Periodo> = {
  octubre: {
    label: "OCTUBRE 2025",
    status: "cerrado",
    kpis: {
      clientes_activos: 4,
      meta_total: 50,
      total_videos: 6,
      entregados: 2,
      en_edicion: 1,
      en_revision: 1,
      atrasados: 4,
      cumplimiento_global: 4.0,
    },
    entregas: [],
    alertas: [
      { titulo: "Informativo Burrito — Reel 1", fecha: "01/10/2025" },
      { titulo: "Informativo Burrito — Reel 2", fecha: "01/10/2025" },
      { titulo: "Caicedo — Acueducto banco y mar", fecha: "04/10/2025" },
      { titulo: "Cantaso Studio — Comercial Chivo Loco", fecha: "08/10/2025" },
    ],
  },
  noviembre: {
    label: "NOVIEMBRE 2025",
    status: "abierto",
    kpis: {
      clientes_activos: 4,
      meta_total: 50,
      total_videos: 0,
      entregados: 0,
      en_edicion: 0,
      en_revision: 0,
      atrasados: 0,
      cumplimiento_global: 0,
    },
    entregas: [
      { titulo: "Reunión mensual Cantaso Studio", fecha: "05/11/2025" },
      { titulo: "Grabación Caicedo — Campus", fecha: "10/11/2025" },
      { titulo: "Entrega Editor Pro — pack reels", fecha: "14/11/2025" },
    ],
    alertas: [],
  },
};

interface KpiCard {
  key: keyof Periodo["kpis"];
  label: string;
  suffix?: string;
  danger?: boolean;
}

const KPI_CARDS: KpiCard[] = [
  { key: "clientes_activos", label: "Clientes activos" },
  { key: "meta_total", label: "Meta total del mes" },
  { key: "total_videos", label: "Videos registrados" },
  { key: "entregados", label: "Entregados" },
  { key: "en_edicion", label: "En edición" },
  { key: "en_revision", label: "En revisión" },
  { key: "atrasados", label: "Atrasados", danger: true },
  { key: "cumplimiento_global", label: "% Cumplimiento", suffix: "%" },
];

export default function DashboardPreviewPage() {
  const [periodoKey, setPeriodoKey] = useState<"octubre" | "noviembre">("octubre");
  const periodo = PERIODOS[periodoKey];

  return (
    <PreviewShell
      active="Dashboard"
      header={
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-border/60 bg-card/60 p-1 backdrop-blur">
            {(["octubre", "noviembre"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setPeriodoKey(key)}
                className={`rounded-md px-3 py-1.5 font-mono text-sm font-medium transition-colors ${
                  periodoKey === key
                    ? "glow-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {PERIODOS[key].label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            Cambia de mes para ver cómo el mes nuevo arranca en cero.
          </span>
          {periodo.status === "cerrado" && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="size-3" />
              Mes cerrado — solo lectura
            </span>
          )}
        </header>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">Productora Lean</h1>
            <p className="text-sm text-muted-foreground">{periodo.label}</p>
          </div>
          <Button asChild className="glow-primary">
            <Link href="/preview/monitoreo">
              <Plus className="size-4" />
              Nuevo video
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPI_CARDS.map(({ key, label, suffix, danger }) => {
            const value = periodo.kpis[key];
            return (
              <div
                key={key}
                className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/40"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-primary/0 blur-2xl transition-all group-hover:bg-primary/25" />
                <p className="relative text-xs text-muted-foreground">{label}</p>
                <p
                  className={`relative mt-1 font-mono text-2xl font-semibold tabular-nums ${
                    danger && value > 0 ? "text-danger" : ""
                  }`}
                >
                  {value}
                  {suffix ?? ""}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[
              { label: "Clientes", href: "/preview/clientes", icon: Users, desc: `${periodo.kpis.clientes_activos} clientes activos este mes` },
              { label: "Monitoreo", href: "/preview/monitoreo", icon: ClipboardList, desc: `${periodo.kpis.en_edicion + periodo.kpis.en_revision} videos en curso` },
              { label: "Calendario", href: "/preview/calendario", icon: CalendarDays, desc: periodo.entregas[0]?.titulo ?? "Sin próximos eventos" },
              { label: "Métricas", href: "/preview/metricas", icon: LineChart, desc: `${periodo.kpis.cumplimiento_global}% de cumplimiento` },
            ].map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={label}
                href={href}
                className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/0 blur-2xl transition-all group-hover:bg-primary/25" />
                <Icon className="relative size-5 text-primary" />
                <h3 className="relative mt-3 font-heading font-semibold">{label}</h3>
                <p className="relative text-sm text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Zap className="size-3.5 text-info" />
                Entregas de esta semana
              </h3>
              <div className="mt-3 space-y-2">
                {periodo.entregas.length > 0 ? (
                  periodo.entregas.map((e) => (
                    <div key={e.titulo} className="flex items-center justify-between text-sm">
                      <span className="truncate">{e.titulo}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.fecha}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <AlertTriangle className="size-4 text-danger" />
                Alertas
              </h3>
              <div className="mt-3 space-y-2">
                {periodo.alertas.length > 0 ? (
                  periodo.alertas.map((a) => (
                    <div key={a.titulo} className="flex items-center justify-between text-sm">
                      <span className="truncate">{a.titulo}</span>
                      <span className="shrink-0 font-mono text-xs text-danger">{a.fecha}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin videos atrasados.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
