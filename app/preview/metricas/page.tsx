"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PreviewShell } from "@/components/preview/preview-shell";
import { MemberAvatar } from "@/components/preview/member-avatar";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import { MIEMBROS_INICIALES, PREVIEW_EQUIPO_KEY, type Miembro } from "@/lib/preview/team-data";
import {
  CLIENTES,
  CLIENTES_METAS,
  ESTADOS,
  PREVIEW_VIDEOS_KEY,
  VIDEOS_INICIALES,
  type VideoSeed,
} from "@/lib/preview/monitoring-data";

const TODOS = "__todos__";
const MUTED_COLOR = "var(--muted-foreground)";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export default function MetricasPreviewPage() {
  const [videos] = useLocalStorageState<VideoSeed[]>(PREVIEW_VIDEOS_KEY, VIDEOS_INICIALES);
  const [miembros] = useLocalStorageState<Miembro[]>(PREVIEW_EQUIPO_KEY, MIEMBROS_INICIALES);

  const [filtroCliente, setFiltroCliente] = useState(TODOS);
  const [filtroEditor, setFiltroEditor] = useState(TODOS);

  const colorPorNombre = useMemo(
    () => new Map(miembros.map((m) => [m.nombre, m.color])),
    [miembros],
  );
  const miembroPorNombre = useMemo(
    () => new Map(miembros.map((m) => [m.nombre, m])),
    [miembros],
  );
  const editoresDisponibles = miembros.filter((m) => m.rol !== "viewer");

  const videosFiltrados = useMemo(
    () =>
      videos.filter(
        (v) =>
          (filtroCliente === TODOS || v.cliente === filtroCliente) &&
          (filtroEditor === TODOS || v.encargado === filtroEditor),
      ),
    [videos, filtroCliente, filtroEditor],
  );

  const hayFiltros = filtroCliente !== TODOS || filtroEditor !== TODOS;

  const kpis = useMemo(() => {
    const total = videosFiltrados.length;
    const entregados = videosFiltrados.filter((v) => v.estado === "aprobado").length;
    const atrasados = videosFiltrados.filter((v) => v.atrasado).length;
    const clientesEnFiltro = new Set(videosFiltrados.map((v) => v.cliente)).size;
    const cumplimiento = total > 0 ? Math.round((entregados / total) * 1000) / 10 : 0;
    return { total, entregados, atrasados, clientesEnFiltro, cumplimiento };
  }, [videosFiltrados]);

  const entregasPorMes = useMemo(
    () => [
      { mes: "Oct 2025", entregados: videosFiltrados.filter((v) => v.estado === "aprobado").length },
      { mes: "Nov 2025", entregados: 0 },
    ],
    [videosFiltrados],
  );

  const porCliente = useMemo(() => {
    const clientesAMostrar = filtroCliente === TODOS ? CLIENTES : [filtroCliente];
    return clientesAMostrar.map((cliente) => ({
      cliente,
      finalizados: videosFiltrados.filter((v) => v.cliente === cliente && v.estado === "aprobado").length,
    }));
  }, [videosFiltrados, filtroCliente]);

  const porEditor = useMemo(() => {
    const nombres = filtroEditor === TODOS ? [...new Set(videos.map((v) => v.encargado))] : [filtroEditor];
    return nombres
      .map((nombre) => ({
        editor: nombre === "—" ? "Sin asignar" : nombre,
        videos: videosFiltrados.filter((v) => v.encargado === nombre).length,
        color: nombre === "—" ? MUTED_COLOR : colorPorNombre.get(nombre) ?? MUTED_COLOR,
      }))
      .filter((e) => e.videos > 0);
  }, [videos, videosFiltrados, filtroEditor, colorPorNombre]);

  const ranking = useMemo(() => {
    const clientesAMostrar = filtroCliente === TODOS ? CLIENTES : [filtroCliente];
    return clientesAMostrar
      .map((cliente) => ({
        cliente,
        entregados: videosFiltrados.filter((v) => v.cliente === cliente && v.estado === "aprobado").length,
        meta: CLIENTES_METAS[cliente] ?? 0,
      }))
      .sort((a, b) => b.entregados - a.entregados);
  }, [videosFiltrados, filtroCliente]);

  function limpiarFiltros() {
    setFiltroCliente(TODOS);
    setFiltroEditor(TODOS);
  }

  return (
    <PreviewShell active="Métricas">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">Métricas</h1>
            <p className="text-sm text-muted-foreground">Histórico OCTUBRE 2025 — NOVIEMBRE 2025</p>
          </div>
          <Button variant="outline" disabled>
            <Download className="size-4" />
            Exportar informe
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 p-3 backdrop-blur">
          <span className="text-xs font-medium text-muted-foreground">Filtrar métricas por:</span>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger size="sm" className="w-[11rem]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los clientes</SelectItem>
              {CLIENTES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEditor} onValueChange={setFiltroEditor}>
            <SelectTrigger size="sm" className="w-[11rem]">
              <SelectValue placeholder="Editor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los editores</SelectItem>
              {editoresDisponibles.map((m) => (
                <SelectItem key={m.correo} value={m.nombre}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hayFiltros && (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
              <X className="size-3.5" />
              Limpiar
            </Button>
          )}
          {hayFiltros && (
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {kpis.total} video(s) en este filtro
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total entregado", value: kpis.entregados },
            { label: "% Cumplimiento", value: `${kpis.cumplimiento}%` },
            { label: "Videos atrasados", value: kpis.atrasados },
            { label: filtroCliente !== TODOS ? "Meta del cliente" : "Clientes atendidos", value: filtroCliente !== TODOS ? CLIENTES_METAS[filtroCliente] : kpis.clientesEnFiltro },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
            <h3 className="font-heading text-sm font-semibold">Videos entregados por mes</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entregasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="entregados" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
            <h3 className="font-heading text-sm font-semibold">
              Finalizados por cliente {filtroEditor !== TODOS && `— ${filtroEditor}`}
            </h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCliente} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="cliente"
                    type="category"
                    width={110}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="finalizados" fill="var(--cyan)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
            <h3 className="font-heading text-sm font-semibold">
              Carga por editor {filtroCliente !== TODOS && `— ${filtroCliente}`}
            </h3>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porEditor} dataKey="videos" nameKey="editor" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {porEditor.map((entry) => (
                      <Cell key={entry.editor} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {porEditor.map((e) => (
                <div key={e.editor} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: e.color }} />
                  {e.editor} · {e.videos}
                </div>
              ))}
              {porEditor.length === 0 && <p className="text-muted-foreground">Sin videos en este filtro.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
            <h3 className="font-heading text-sm font-semibold">Ranking de clientes</h3>
            <div className="mt-4 space-y-3">
              {ranking.map((c, i) => (
                <div key={c.cliente} className="flex items-center gap-3">
                  <span className="w-5 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                  <span className="w-36 truncate text-sm">{c.cliente}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
                      style={{ width: `${Math.max(4, (c.entregados / (c.meta || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {c.entregados}/{c.meta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {hayFiltros && (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur">
            <div className="border-b border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground">
              Videos incluidos en este filtro
            </div>
            <table className="w-full text-sm">
              <tbody>
                {videosFiltrados.map((v) => (
                  <tr key={v.id} className="border-b border-border/40 last:border-b-0">
                    <td className="px-4 py-2 font-medium">{v.cliente}</td>
                    <td className="px-4 py-2 text-muted-foreground">{v.titulo}</td>
                    <td className="px-4 py-2">
                      {v.encargado === "—" ? (
                        <span className="text-muted-foreground">Sin asignar</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <MemberAvatar
                            nombre={v.encargado}
                            color={miembroPorNombre.get(v.encargado)?.color}
                            foto={miembroPorNombre.get(v.encargado)?.foto}
                            icono={miembroPorNombre.get(v.encargado)?.icono}
                            className="size-4"
                            textClassName="text-[8px]"
                          />
                          {v.encargado}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${ESTADOS[v.estado].bg} ${ESTADOS[v.estado].text}`}>
                        <span className={`size-1.5 rounded-full ${ESTADOS[v.estado].dot}`} />
                        {ESTADOS[v.estado].label}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{v.entrega}</td>
                  </tr>
                ))}
                {videosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Ningún video coincide con este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PreviewShell>
  );
}
