"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarCheck2,
  CalendarIcon,
  GraduationCap,
  MoreHorizontal,
  Package,
  PartyPopper,
  Plus,
  Radio,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePickerField } from "@/components/preview/time-picker-field";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar-events";
import { zonedDateParts, zonedTimeToUtcIso } from "@/lib/utils/timezone";
import type { EventType, MemberRole } from "@/types/database.types";

interface EventoFull {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  client_id: string | null;
  video_id: string | null;
  start_at: string;
  end_at: string;
  is_virtual: boolean;
}

interface Miembro {
  id: string;
  full_name: string | null;
  email: string;
  role: MemberRole;
}

interface CalendarioClientProps {
  periodId: string | null;
  periodLabel: string | null;
  year: number;
  month: number; // 1-12
  timezone: string;
  eventos: EventoFull[];
  miembros: Miembro[];
  asignadoPorEvento: Record<string, string>;
  googleConectado: boolean;
  puedeEditar: boolean;
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TIPO_STYLE: Record<EventType, { label: string; icon: typeof Users; className: string }> = {
  reunion: { label: "Reunión", icon: Users, className: "bg-info/15 text-info ring-1 ring-info/40" },
  grabacion: { label: "Grabación", icon: Radio, className: "bg-violet/15 text-violet ring-1 ring-violet/40" },
  entrega: { label: "Entrega", icon: Truck, className: "bg-success/15 text-success ring-1 ring-success/40" },
  clase: { label: "Clase", icon: GraduationCap, className: "bg-warning/15 text-warning ring-1 ring-warning/40" },
  evento: { label: "Evento", icon: PartyPopper, className: "bg-cyan/15 text-cyan ring-1 ring-cyan/40" },
  otro: { label: "Otro", icon: MoreHorizontal, className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

function MiembroAvatar({ miembro, className = "size-3.5" }: { miembro?: Miembro; className?: string }) {
  if (!miembro) return null;
  const nombre = miembro.full_name || miembro.email;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ${className}`}
      style={{ backgroundColor: avatarColor(miembro.id) }}
      title={nombre}
    >
      {initials(nombre)}
    </span>
  );
}

// Selector de día acotado al mes del período activo — no tiene sentido
// crear un evento fuera del mes que se está viendo. Sin Popover/Portal por
// la misma razón que TimePickerField: evita el conflicto con el Dialog que
// lo contiene.
function DiaPickerField({
  year,
  month,
  dia,
  onChange,
  disabled,
}: {
  year: number;
  month: number; // 1-12
  dia: number;
  onChange: (dia: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fecha = new Date(year, month - 1, dia);
  const mesActivo = new Date(year, month - 1, 1);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
        className="w-full justify-start gap-1.5 font-normal"
      >
        <CalendarIcon className="size-3.5" />
        {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
      </Button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-popover shadow-md ring-1 ring-foreground/10">
          <Calendar
            mode="single"
            selected={fecha}
            defaultMonth={mesActivo}
            disabled={(date) => date.getMonth() !== month - 1 || date.getFullYear() !== year}
            onSelect={(date) => {
              if (!date) return;
              onChange(date.getDate());
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

interface FormState {
  titulo: string;
  tipo: EventType;
  asignadoId: string;
  dia: number;
  hora: string;
}

function EventoCamposForm({
  state,
  setState,
  year,
  month,
  responsables,
  disabled,
}: {
  state: FormState;
  setState: (s: FormState) => void;
  year: number;
  month: number;
  responsables: Miembro[];
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="titulo-evento">Título *</Label>
        <Input
          id="titulo-evento"
          value={state.titulo}
          onChange={(e) => setState({ ...state, titulo: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={state.tipo}
            onValueChange={(v) => setState({ ...state, tipo: v as EventType })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_STYLE).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Responsable</Label>
          <Select
            value={state.asignadoId}
            onValueChange={(v) => setState({ ...state, asignadoId: v })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {responsables.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-1.5">
                    <MiembroAvatar miembro={m} />
                    {m.full_name || m.email}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <DiaPickerField
            year={year}
            month={month}
            dia={state.dia}
            onChange={(dia) => setState({ ...state, dia })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hora</Label>
          <TimePickerField
            value={state.hora}
            onChange={(hora) => setState({ ...state, hora })}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}

export function CalendarioClient({
  periodId,
  periodLabel,
  year,
  month,
  timezone,
  eventos,
  miembros,
  asignadoPorEvento,
  googleConectado,
  puedeEditar,
}: CalendarioClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const responsables = miembros.filter((m) => m.role !== "viewer");
  const mesLabel = new Date(year, month - 1, 1)
    .toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    .toUpperCase();

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoState, setNuevoState] = useState<FormState>({
    titulo: "",
    tipo: "reunion",
    asignadoId: responsables[0]?.id ?? "",
    dia: 1,
    hora: "10:00",
  });

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [eventoDetalle, setEventoDetalle] = useState<EventoFull | null>(null);
  const [detalleState, setDetalleState] = useState<FormState>({
    titulo: "",
    tipo: "reunion",
    asignadoId: "",
    dia: 1,
    hora: "10:00",
  });

  const diasEnMes = new Date(year, month, 0).getDate();
  const leadingBlanks = new Date(year, month - 1, 1).getDay();
  const cells = [...Array(leadingBlanks).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];

  const eventosPorDia = new Map<number, EventoFull[]>();
  for (const ev of eventos) {
    const { day } = zonedDateParts(ev.start_at, timezone);
    eventosPorDia.set(day, [...(eventosPorDia.get(day) ?? []), ev]);
  }

  function abrirNuevoEvento(dia: number) {
    if (!puedeEditar || !periodId) return;
    setNuevoState({ titulo: "", tipo: "reunion", asignadoId: responsables[0]?.id ?? "", dia, hora: "10:00" });
    setNuevoOpen(true);
  }

  function abrirDetalle(evento: EventoFull, e?: React.SyntheticEvent) {
    e?.stopPropagation();
    const { day, hour, minute } = zonedDateParts(evento.start_at, timezone);
    setEventoDetalle(evento);
    setDetalleState({
      titulo: evento.title,
      tipo: evento.type,
      asignadoId: asignadoPorEvento[evento.id] ?? "",
      dia: day,
      hora: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    });
    setDetalleOpen(true);
  }

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEditar || !nuevoState.titulo.trim()) return;
    const [hh, mm] = nuevoState.hora.split(":").map(Number);
    const startAt = zonedTimeToUtcIso(year, month, nuevoState.dia, hh, mm, timezone);
    const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();

    startTransition(async () => {
      try {
        await createCalendarEvent({
          title: nuevoState.titulo.trim(),
          type: nuevoState.tipo,
          startAt,
          endAt,
          assignedMembershipId: nuevoState.asignadoId || undefined,
        });
        toast.success(`Evento creado para el ${nuevoState.dia}/${month}`);
        setNuevoOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo crear el evento.");
      }
    });
  }

  function handleGuardarDetalle(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEditar || !eventoDetalle || !detalleState.titulo.trim()) return;
    const [hh, mm] = detalleState.hora.split(":").map(Number);
    const startAt = zonedTimeToUtcIso(year, month, detalleState.dia, hh, mm, timezone);
    const duracionMs = new Date(eventoDetalle.end_at).getTime() - new Date(eventoDetalle.start_at).getTime();
    const endAt = new Date(new Date(startAt).getTime() + Math.max(duracionMs, 30 * 60 * 1000)).toISOString();

    startTransition(async () => {
      const result = await updateCalendarEvent({
        id: eventoDetalle.id,
        title: detalleState.titulo.trim(),
        type: detalleState.tipo,
        startAt,
        endAt,
        assignedMembershipId: detalleState.asignadoId || undefined,
      });
      if (result.ok) {
        toast.success("Evento actualizado");
        setDetalleOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleEliminarDetalle() {
    if (!puedeEditar || !eventoDetalle) return;
    startTransition(async () => {
      const result = await deleteCalendarEvent(eventoDetalle.id);
      if (result.ok) {
        toast.success("Evento eliminado");
        setDetalleOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const proximos = [...eventos]
    .filter((e) => new Date(e.start_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            {periodLabel ?? mesLabel} · Clic en una fecha vacía para crear un evento, o en un evento para ver su
            detalle
          </p>
        </div>
        <div className="flex items-center gap-2">
          {googleConectado ? (
            <Badge variant="outline" className="gap-1 border-success/40 text-success">
              <CalendarCheck2 className="size-3.5" />
              Google Calendar conectado
            </Badge>
          ) : (
            <Link href="/app/configuracion">
              <Badge
                variant="outline"
                className="gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <CalendarCheck2 className="size-3.5" />
                Conectar Google Calendar
              </Badge>
            </Link>
          )}
          <Button
            onClick={() => abrirNuevoEvento(nuevoState.dia || 1)}
            disabled={!puedeEditar || !periodId}
            title={!puedeEditar ? "Solo el propietario o un administrador puede crear eventos" : undefined}
          >
            <Plus className="size-4" />
            Nuevo evento
          </Button>
        </div>
      </div>

      {!periodId ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay un periodo abierto todavía. Abre un mes para empezar a agendar eventos.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-7 border-b">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="border-r p-2 text-center font-mono text-xs uppercase text-muted-foreground last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const eventosDelDia = day ? eventosPorDia.get(day) ?? [] : [];
                const puedeCrear = Boolean(day) && puedeEditar;
                return (
                  // No es <button>: cada evento adentro ya es un botón, y un
                  // <button> no puede contener otro <button>.
                  <div
                    key={i}
                    role={puedeCrear ? "button" : undefined}
                    tabIndex={puedeCrear ? 0 : undefined}
                    onClick={() => day && abrirNuevoEvento(day)}
                    onKeyDown={(e) => {
                      if (puedeCrear && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        abrirNuevoEvento(day as number);
                      }
                    }}
                    className={`min-h-24 space-y-1 border-b border-r p-2 text-left last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                      puedeCrear ? "cursor-pointer transition-colors hover:bg-primary/5" : ""
                    }`}
                  >
                    {day && (
                      <>
                        <span className="font-mono text-xs text-muted-foreground">{day}</span>
                        {eventosDelDia.map((evento) => {
                          const style = TIPO_STYLE[evento.type];
                          const asignado = miembros.find((m) => m.id === asignadoPorEvento[evento.id]);
                          return (
                            <button
                              type="button"
                              key={evento.id}
                              onClick={(e) => (evento.is_virtual ? e.stopPropagation() : abrirDetalle(evento, e))}
                              className={`flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] transition-opacity hover:opacity-80 ${style.className}`}
                              title={evento.is_virtual ? "Fecha de entrega — edítala desde Monitoreo" : undefined}
                            >
                              {evento.is_virtual ? (
                                <Package className="size-3 shrink-0" />
                              ) : (
                                <style.icon className="size-3 shrink-0" />
                              )}
                              <span className="truncate">{evento.title}</span>
                              <MiembroAvatar miembro={asignado} />
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Próximos eventos</h3>
              <div className="mt-3 space-y-3">
                {proximos.map((evento) => {
                  const style = TIPO_STYLE[evento.type];
                  const { day, hour, minute } = zonedDateParts(evento.start_at, timezone);
                  return (
                    <button
                      type="button"
                      key={evento.id}
                      onClick={() => !evento.is_virtual && abrirDetalle(evento)}
                      className="flex w-full items-start gap-2 rounded-md text-left transition-colors hover:bg-muted/40"
                    >
                      <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${style.className}`}>
                        {evento.is_virtual ? <Package className="size-3.5" /> : <style.icon className="size-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{evento.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {day}/{month} · {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {proximos.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Sincronizado con Monitoreo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Cada video con fecha de entrega aparece aquí automáticamente, sin duplicar datos.
              </p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nuevo evento — {nuevoState.dia}/{month}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrear} className="space-y-4">
            <EventoCamposForm
              state={nuevoState}
              setState={setNuevoState}
              year={year}
              month={month}
              responsables={responsables}
              disabled={!puedeEditar || isPending}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="glow-primary" disabled={!puedeEditar || isPending}>
                Crear evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{puedeEditar ? "Detalle del evento" : detalleState.titulo}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarDetalle} className="space-y-4">
            <EventoCamposForm
              state={detalleState}
              setState={setDetalleState}
              year={year}
              month={month}
              responsables={responsables}
              disabled={!puedeEditar || isPending}
            />
            <DialogFooter>
              {puedeEditar ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger hover:text-danger sm:mr-auto"
                    onClick={handleEliminarDetalle}
                    disabled={isPending}
                  >
                    Eliminar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDetalleOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="glow-primary" disabled={isPending}>
                    Guardar cambios
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => setDetalleOpen(false)}>
                  Cerrar
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
