"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  Mail,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoreoTableContent } from "./monitoreo-hero-preview";

// Rieles de navegación en miniatura, para que el mockup se lea como la app
// real (con su sidebar) y no solo como tarjetas sueltas.
function NavRail({ activo }: { activo: string }) {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: Users, label: "Clientes" },
    { icon: ClipboardList, label: "Monitoreo" },
    { icon: CalendarDays, label: "Calendario" },
    { icon: LineChart, label: "Métricas" },
  ];
  return (
    <div className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r border-border/50 bg-background/30 py-4 sm:flex">
      {items.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-colors",
            label === activo
              ? "bg-primary/15 text-primary ring-1 ring-primary/40"
              : "text-muted-foreground/50",
          )}
        >
          <Icon className="size-4" />
        </span>
      ))}
    </div>
  );
}

// Marco tipo navegador compartido por los 3 showcases — mismo lenguaje
// visual que ya usa el resto del Home (puntos de semáforo + barra de URL),
// a tamaño grande y con todo el detalle (no la versión mini de fondo).
function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 border-b border-border/50 px-5 py-3">
        <span className="size-2.5 rounded-full bg-danger/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-3 flex-1 truncate rounded-full bg-muted/40 px-3 py-1.5 font-mono text-xs text-muted-foreground">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

// Interpola desde el último valor mostrado (no siempre desde 0), para que
// cuando el target cambie en vivo (ej. un cliente nuevo) el número suba con
// un salto corto y suave en vez de reiniciar la cuenta desde cero.
function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (!active) return;
    const from = fromRef.current;
    let raf: number;
    const start = performance.now();
    const duration = from === 0 ? 1400 : 700;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return value;
}

const DASHBOARD_KPIS = [
  { label: "Clientes activos", target: 4, trend: "+1" },
  { label: "Meta total del mes", target: 50, trend: "+8%" },
  { label: "Entregados", target: 18, trend: "+22%" },
  { label: "% Cumplimiento", target: 82, suffix: "%", trend: "+5%" },
];

// Tendencia de entregas de las últimas semanas — una curva suave en vez de
// barras planas, para que se lea como un gráfico de verdad.
const CHART_POINTS = [28, 34, 30, 46, 52, 44, 60, 68, 58, 78, 88, 96];

function buildSmoothPath(points: number[], width: number, height: number, pad = 8) {
  const innerH = height - pad * 2;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => [i * stepX, pad + innerH - (p / 100) * innerH]);
  let d = `M ${coords[0][0]},${coords[0][1]}`;
  for (let i = 1; i < coords.length; i++) {
    const [x0, y0] = coords[i - 1];
    const [x1, y1] = coords[i];
    const midX = (x0 + x1) / 2;
    d += ` C ${midX},${y0} ${midX},${y1} ${x1},${y1}`;
  }
  return d;
}

function TrendChart() {
  const width = 600;
  const height = 148;
  const line = buildSmoothPath(CHART_POINTS, width, height);
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  const lastX = width;
  const lastY = height - 8 - ((height - 16) * CHART_POINTS[CHART_POINTS.length - 1]) / 100;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-36 w-full">
      <defs>
        <linearGradient id="showcase-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="showcase-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--cyan)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#showcase-area)" />
      <path d={line} fill="none" stroke="url(#showcase-line)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={lastX - 3} cy={lastY} r="5" fill="var(--primary)" className="animate-pulse-slow" />
    </svg>
  );
}


function KpiTile({
  label,
  target,
  suffix,
  trend,
  active,
}: {
  label: string;
  target: number;
  suffix?: string;
  trend: string;
  active: boolean;
}) {
  const value = useCountUp(target, active);
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:border-primary/40">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {value}
          {suffix}
        </p>
        <span className="flex items-center gap-0.5 text-[11px] font-medium text-success">
          <TrendingUp className="size-3" />
          {trend}
        </span>
      </div>
    </div>
  );
}

const NUEVOS_CLIENTES = ["Vértigo Films", "Estudio Norte", "Rayo Studio"];
const ESCENA_MS = 5000; // 2 escenas × 5s = 10s de ciclo completo

// La vitrina del hero, con más vida: en la escena de Dashboard entra un
// cliente nuevo (el contador sube y avisa), y a los 5s la misma ventana
// "navega" sola a Monitoreo — un recorrido de ~10s en loop, en vez de una
// imagen fija.
export function HeroLiveShowcase() {
  const [visible, setVisible] = useState(false);
  const [escena, setEscena] = useState<"dashboard" | "monitoreo">("dashboard");
  const [clienteIdx, setClienteIdx] = useState(0);
  const [nuevoClienteVisible, setNuevoClienteVisible] = useState(false);

  useEffect(() => setVisible(true), []);

  useEffect(() => {
    if (escena !== "dashboard") return;
    const t = setTimeout(() => setNuevoClienteVisible(true), 2200);
    return () => clearTimeout(t);
  }, [escena, clienteIdx]);

  useEffect(() => {
    const t = setTimeout(() => {
      setEscena((actual) => {
        if (actual === "dashboard") return "monitoreo";
        setNuevoClienteVisible(false);
        setClienteIdx((i) => (i + 1) % NUEVOS_CLIENTES.length);
        return "dashboard";
      });
    }, ESCENA_MS);
    return () => clearTimeout(t);
  }, [escena]);

  const kpis = DASHBOARD_KPIS.map((kpi) =>
    kpi.label === "Clientes activos" && nuevoClienteVisible
      ? { ...kpi, target: kpi.target + 1 }
      : kpi,
  );

  return (
    <div className="relative">
      {/* Glow ambiental detrás de la vitrina principal — le da presencia de
          "hero shot" en vez de una tarjeta plana más. */}
      <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-primary/25 via-cyan/15 to-transparent blur-3xl" />
      <BrowserFrame url={escena === "dashboard" ? "app.editflow.io/dashboard" : "app.editflow.io/monitoreo"}>
        <div className="flex items-stretch">
          <NavRail activo={escena === "dashboard" ? "Dashboard" : "Monitoreo"} />
          {/* Alto fijo compartido por las dos escenas — para que la vitrina
              no cambie de tamaño al alternar entre Dashboard y Monitoreo. */}
          <div key={escena} className="h-[420px] min-w-0 flex-1 animate-in fade-in duration-500">
            {escena === "dashboard" ? (
              <div className="relative flex h-full flex-col justify-center">
                <div
                  className={cn(
                    "pointer-events-none absolute right-6 top-5 z-10 flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary shadow-lg backdrop-blur transition-all duration-300",
                    nuevoClienteVisible ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Nuevo cliente: {NUEVOS_CLIENTES[clienteIdx]}
                </div>
                <div className="flex items-center justify-between px-6">
                  <div>
                    <h3 className="font-heading text-sm font-semibold tracking-tight">Resumen del mes</h3>
                    <p className="text-xs text-muted-foreground">Noviembre 2025</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                    <span className="size-1.5 animate-pulse-slow rounded-full bg-success shadow-[0_0_6px_var(--success)]" />
                    En vivo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
                  {kpis.map((kpi) => (
                    <KpiTile key={kpi.label} {...kpi} active={visible} />
                  ))}
                </div>
                <div className="px-6 pb-6">
                  <TrendChart />
                </div>
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <MonitoreoTableContent showUrlBar={false} />
              </div>
            )}
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}

const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"];
const CELDAS = 28; // 4 semanas — más compacto, sin perder el patrón semanal

interface EventoCal {
  dia: number;
  label: string;
  color: string;
  destinatario: string;
}

const EVENTOS_CALENDARIO: EventoCal[] = [
  { dia: 5, label: "Reunión Cantaso", color: "bg-info/20 text-info ring-1 ring-info/40", destinatario: "Lian" },
  { dia: 10, label: "Grabación Caicedo", color: "bg-violet/20 text-violet ring-1 ring-violet/40", destinatario: "Diego" },
  { dia: 14, label: "Entrega Editor Pro", color: "bg-success/20 text-success ring-1 ring-success/40", destinatario: "Zax" },
  { dia: 22, label: "Reunión Burrito", color: "bg-info/20 text-info ring-1 ring-info/40", destinatario: "Lian" },
];

const EVENTOS_POR_DIA = new Map(EVENTOS_CALENDARIO.map((e) => [e.dia, e]));

// Ciclo animado: cada ~3s "crea" el siguiente evento — el día se resalta y
// aparece una notificación (correo enviado / agendado en Google Calendar),
// alternando, para que la vitrina se sienta viva y no un mockup estático.
export function CalendarioShowcase() {
  const [activo, setActivo] = useState(0);
  const [notifVisible, setNotifVisible] = useState(true);

  useEffect(() => {
    let cambio: ReturnType<typeof setTimeout>;
    const ciclo = setInterval(() => {
      setNotifVisible(false);
      cambio = setTimeout(() => {
        setActivo((i) => (i + 1) % EVENTOS_CALENDARIO.length);
        setNotifVisible(true);
      }, 350);
    }, 3200);
    return () => {
      clearInterval(ciclo);
      clearTimeout(cambio);
    };
  }, []);

  const evento = EVENTOS_CALENDARIO[activo];
  const esCorreo = activo % 2 === 0;

  return (
    <BrowserFrame url="app.editflow.io/calendario">
      <div className="relative p-5">
        <div
          className={cn(
            "pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur transition-all duration-300",
            esCorreo
              ? "border-info/40 bg-info/10 text-info"
              : "border-success/40 bg-success/10 text-success",
            notifVisible ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
          )}
        >
          {esCorreo ? <Mail className="size-3.5" /> : <CalendarCheck2 className="size-3.5" />}
          {esCorreo ? `Correo enviado a ${evento.destinatario}` : "Agendado en Google Calendar"}
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i} className="text-center font-mono text-[10px] uppercase text-muted-foreground">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: CELDAS }, (_, i) => i + 1).map((dia) => {
            const ev = EVENTOS_POR_DIA.get(dia);
            const esActivo = ev && dia === evento.dia;
            return (
              <div
                key={dia}
                className={cn(
                  "flex aspect-[4/3] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-all duration-300",
                  esActivo ? "border-primary/60 ring-2 ring-primary/40" : "border-border/40",
                )}
              >
                <span className="font-mono text-[10px] text-muted-foreground">{dia}</span>
                {ev && (
                  <span className={`w-full truncate rounded px-1 py-0.5 text-[9px] ${ev.color}`}>{ev.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </BrowserFrame>
  );
}

const CLIENTES_SHOWCASE = [
  { nombre: "Caicedo", encargado: "Zax", meta: 12, hechos: 9, color: "#06B6D4" },
  { nombre: "Cantaso Studio", encargado: "Lian", meta: 10, hechos: 4, color: "#F59E0B" },
  { nombre: "Informativo Burrito", encargado: "Diego", meta: 20, hechos: 6, color: "#10B981" },
];

export function ClientesShowcase() {
  return (
    <BrowserFrame url="app.editflow.io/clientes">
      <div className="grid gap-2.5 p-5">
        {CLIENTES_SHOWCASE.map((c) => {
          const pct = Math.round((c.hechos / c.meta) * 100);
          return (
            <div
              key={c.nombre}
              className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3 transition-colors hover:border-primary/40"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: c.color }}
              >
                {c.encargado.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="truncate font-heading text-sm font-bold tracking-tight">{c.nombre}</h4>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {c.hechos} / {c.meta}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {pct >= 40 && (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              )}
            </div>
          );
        })}
      </div>
    </BrowserFrame>
  );
}
