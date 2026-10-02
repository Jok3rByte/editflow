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
import type { MemberRole } from "@/types/database.types";

const TODOS = "__todos__";
const MUTED_COLOR = "var(--muted-foreground)";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

interface ClientMonthRow {
  client_id: string;
  cliente: string;
  periodo: string;
  month_key: string;
  meta_mensual: number;
  finalizados: number;
  porcentaje_alcance_meta: number | null;
}

interface EditorMonthRow {
  editor_id: string;
  editor: string | null;
  periodo: string;
  month_key: string;
  videos_asignados: number;
  entregados: number;
}

interface ClienteOpcion {
  id: string;
  name: string;
}

interface Miembro {
  id: string;
  full_name: string | null;
  email: string;
  role: MemberRole;
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 55%)`;
}

function descargarCSV(filas: Record<string, string | number>[], nombreArchivo: string) {
  if (filas.length === 0) return;
  const columnas = Object.keys(filas[0]);
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [columnas.join(","), ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(","))].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function MetricasClient({
  clientSeries,
  editorSeries,
  clientes,
  miembros,
}: {
  clientSeries: ClientMonthRow[];
  editorSeries: EditorMonthRow[];
  clientes: ClienteOpcion[];
  miembros: Miembro[];
}) {
  const [filtroCliente, setFiltroCliente] = useState(TODOS);
  const [filtroEditor, setFiltroEditor] = useState(TODOS);
  const hayFiltros = filtroCliente !== TODOS || filtroEditor !== TODOS;

  const editoresDisponibles = miembros.filter((m) => m.role !== "viewer");

  const clientSeriesFiltrada = useMemo(
    () => (filtroCliente === TODOS ? clientSeries : clientSeries.filter((r) => r.client_id === filtroCliente)),
    [clientSeries, filtroCliente],
  );

  const kpis = useMemo(() => {
    const totalFinalizados = clientSeriesFiltrada.reduce((s, r) => s + r.finalizados, 0);
    const totalMeta = clientSeriesFiltrada.reduce((s, r) => s + r.meta_mensual, 0);
    const cumplimiento = totalMeta > 0 ? Math.round((totalFinalizados / totalMeta) * 1000) / 10 : 0;
    const clientesDistintos = new Set(clientSeriesFiltrada.map((r) => r.client_id)).size;
    return { totalFinalizados, totalMeta, cumplimiento, clientesDistintos };
  }, [clientSeriesFiltrada]);

  const entregasPorMes = useMemo(() => {
    const porMes = new Map<string, { mes: string; entregados: number }>();
    for (const r of clientSeriesFiltrada) {
      const actual = porMes.get(r.month_key) ?? { mes: r.periodo, entregados: 0 };
      actual.entregados += r.finalizados;
      porMes.set(r.month_key, actual);
    }
    return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [clientSeriesFiltrada]);

  const porCliente = useMemo(() => {
    const base = filtroCliente === TODOS ? clientSeries : clientSeries.filter((r) => r.client_id === filtroCliente);
    const porId = new Map<string, { cliente: string; finalizados: number; meta: number }>();
    for (const r of base) {
      const actual = porId.get(r.client_id) ?? { cliente: r.cliente, finalizados: 0, meta: 0 };
      actual.finalizados += r.finalizados;
      actual.meta += r.meta_mensual;
      porId.set(r.client_id, actual);
    }
    return [...porId.values()].sort((a, b) => b.finalizados - a.finalizados);
  }, [clientSeries, filtroCliente]);

  const porEditor = useMemo(() => {
    const base = filtroEditor === TODOS ? editorSeries : editorSeries.filter((r) => r.editor_id === filtroEditor);
    const porId = new Map<string, { editor: string; videos: number; color: string }>();
    for (const r of base) {
      const nombre = r.editor ?? "Sin asignar";
      const actual = porId.get(r.editor_id) ?? {
        editor: nombre,
        videos: 0,
        color: r.editor ? avatarColor(r.editor_id) : MUTED_COLOR,
      };
      actual.videos += r.entregados;
      porId.set(r.editor_id, actual);
    }
    return [...porId.values()].filter((e) => e.videos > 0);
  }, [editorSeries, filtroEditor]);

  function limpiarFiltros() {
    setFiltroCliente(TODOS);
    setFiltroEditor(TODOS);
  }

  function exportar() {
    descargarCSV(
      clientSeriesFiltrada.map((r) => ({
        periodo: r.periodo,
        cliente: r.cliente,
        meta: r.meta_mensual,
        finalizados: r.finalizados,
        cumplimiento_pct: r.porcentaje_alcance_meta ?? 0,
      })),
      "editflow-metricas.csv",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Métricas</h1>
          <p className="text-sm text-muted-foreground">Histórico de todos los meses cerrados y abiertos.</p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={clientSeriesFiltrada.length === 0}>
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <span className="text-xs font-medium text-muted-foreground">Filtrar métricas por:</span>
        <Select value={filtroCliente} onValueChange={setFiltroCliente}>
          <SelectTrigger size="sm" className="w-[11rem]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
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
              <SelectItem key={m.id} value={m.id}>
                {m.full_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
            <X className="size-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {clientSeries.length === 0 && editorSeries.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Todavía no hay historial — cierra al menos un mes con videos entregados para empezar a ver métricas.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total entregado", value: kpis.totalFinalizados },
              { label: "% Cumplimiento", value: `${kpis.cumplimiento}%` },
              { label: "Meta acumulada", value: kpis.totalMeta },
              { label: "Clientes en el filtro", value: kpis.clientesDistintos },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Videos entregados por mes</h3>
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

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Finalizados por cliente</h3>
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
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Carga por editor</h3>
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
                {porEditor.length === 0 && <p className="text-muted-foreground">Sin entregas en este filtro.</p>}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Ranking de clientes</h3>
              <div className="mt-4 space-y-3">
                {porCliente.map((c, i) => (
                  <div key={c.cliente} className="flex items-center gap-3">
                    <span className="w-5 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="w-36 truncate text-sm">{c.cliente}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
                        style={{ width: `${Math.max(4, (c.finalizados / (c.meta || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {c.finalizados}/{c.meta}
                    </span>
                  </div>
                ))}
                {porCliente.length === 0 && <p className="text-sm text-muted-foreground">Sin datos todavía.</p>}
              </div>
            </div>
          </div>

          {hayFiltros && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                Meses incluidos en este filtro
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {clientSeriesFiltrada.map((r) => (
                    <tr key={`${r.client_id}-${r.month_key}`} className="border-b last:border-b-0">
                      <td className="px-4 py-2 font-medium">{r.cliente}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.periodo}</td>
                      <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                        {r.finalizados} / {r.meta_mensual}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                        {r.porcentaje_alcance_meta ?? 0}%
                      </td>
                    </tr>
                  ))}
                  {clientSeriesFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Ningún mes coincide con este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
