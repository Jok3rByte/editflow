"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck2, CalendarIcon, Plus, Radio, Truck, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { PreviewShell } from "@/components/preview/preview-shell";
import { TimePickerField } from "@/components/preview/time-picker-field";
import { MemberAvatar } from "@/components/preview/member-avatar";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import { MIEMBROS_INICIALES, PREVIEW_EQUIPO_KEY, type Miembro } from "@/lib/preview/team-data";
import { puedeEditar, useSessionRole } from "@/lib/preview/session";
import { useGoogleConnection } from "@/lib/preview/google-connection";

// Mes activo del período = el mes real de hoy, no uno fijo a mano — así el
// calendario siempre muestra la fecha exacta actual.
const HOY = new Date();
const ANIO_ACTIVO = HOY.getFullYear();
const MES_ACTIVO_INDICE = HOY.getMonth(); // 0 = enero
const MES_ACTIVO = new Date(ANIO_ACTIVO, MES_ACTIVO_INDICE, 1);
const MES_ACTIVO_LABEL = format(MES_ACTIVO, "MMMM yyyy", { locale: es }).toUpperCase();

function fechaLabel(dia: number) {
  return `${dia}/${String(MES_ACTIVO_INDICE + 1).padStart(2, "0")}/${ANIO_ACTIVO}`;
}

// Calendario real acotado al período activo (el mes actual): los días de
// otros meses quedan deshabilitados porque un evento solo puede pertenecer
// al período que se está viendo. Sin Popover/Portal por la misma razón que
// TimePickerField — evita el conflicto con el Dialog que lo contiene.
function DiaPickerField({
  dia,
  onChange,
  disabled,
}: {
  dia: number;
  onChange: (dia: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fecha = new Date(ANIO_ACTIVO, MES_ACTIVO_INDICE, dia);

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
        {format(fecha, "d 'de' MMMM", { locale: es })}
      </Button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-popover shadow-md ring-1 ring-foreground/10">
          <Calendar
            mode="single"
            selected={fecha}
            defaultMonth={MES_ACTIVO}
            locale={es}
            disabled={(date) => date.getMonth() !== MES_ACTIVO_INDICE || date.getFullYear() !== ANIO_ACTIVO}
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

type Tipo = "reunion" | "grabacion" | "entrega";

interface Evento {
  id: string;
  dia: number;
  titulo: string;
  tipo: Tipo;
  hora: string;
  responsable: string;
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Día de la semana en que cae el 1 del mes activo (0=domingo), y cuántos
// días tiene ese mes — calculados del mes real, no fijos a mano.
const LEADING_BLANKS = new Date(ANIO_ACTIVO, MES_ACTIVO_INDICE, 1).getDay();
const DIAS_MES = new Date(ANIO_ACTIVO, MES_ACTIVO_INDICE + 1, 0).getDate();

// Eventos y responsables de ejemplo (mismos que event_attendees en
// supabase/seed.sql), reubicados al mes activo actual.
const EVENTOS_INICIALES: Evento[] = [
  { id: "e1", dia: 5, titulo: "Reunión Cantaso Studio", tipo: "reunion", hora: "15:00", responsable: "Lian" },
  { id: "e2", dia: 10, titulo: "Grabación Caicedo", tipo: "grabacion", hora: "09:00", responsable: "Diego" },
  { id: "e3", dia: 14, titulo: "Entrega Editor Pro", tipo: "entrega", hora: "12:00", responsable: "Zax" },
];

const TIPO_STYLE: Record<Tipo, { label: string; icon: typeof Users; className: string }> = {
  reunion: { label: "Reunión", icon: Users, className: "bg-info/15 text-info ring-1 ring-info/40" },
  grabacion: { label: "Grabación", icon: Radio, className: "bg-violet/15 text-violet ring-1 ring-violet/40" },
  entrega: { label: "Entrega", icon: Truck, className: "bg-success/15 text-success ring-1 ring-success/40" },
};

function ResponsableAvatar({ nombre, miembro }: { nombre: string; miembro?: Miembro }) {
  if (!miembro) return null;
  return (
    <MemberAvatar
      nombre={nombre}
      color={miembro.color}
      foto={miembro.foto}
      icono={miembro.icono}
      className="size-3.5"
      textClassName="text-[7px]"
    />
  );
}

// Campos compartidos entre "Nuevo evento" y "Detalle del evento" para no
// duplicar el formulario dos veces.
function EventoCamposForm({
  titulo,
  setTitulo,
  tipo,
  setTipo,
  responsable,
  setResponsable,
  dia,
  setDia,
  hora,
  setHora,
  responsablesDisponibles,
  disabled,
}: {
  titulo: string;
  setTitulo: (v: string) => void;
  tipo: Tipo;
  setTipo: (v: Tipo) => void;
  responsable: string;
  setResponsable: (v: string) => void;
  dia: number;
  setDia: (v: number) => void;
  hora: string;
  setHora: (v: string) => void;
  responsablesDisponibles: Miembro[];
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="p-titulo-evento">Título *</Label>
        <Input
          id="p-titulo-evento"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reunion">Reunión</SelectItem>
              <SelectItem value="grabacion">Grabación</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Responsable</Label>
          <Select value={responsable} onValueChange={setResponsable} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {responsablesDisponibles.map((m) => (
                <SelectItem key={m.correo} value={m.nombre}>
                  <span className="flex items-center gap-1.5">
                    <ResponsableAvatar nombre={m.nombre} miembro={m} />
                    {m.nombre}
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
          <DiaPickerField dia={dia} onChange={setDia} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label>Hora</Label>
          <TimePickerField value={hora} onChange={setHora} disabled={disabled} />
        </div>
      </div>
    </>
  );
}

export default function CalendarioPreviewPage() {
  const [eventos, setEventos] = useState<Evento[]>(EVENTOS_INICIALES);
  const [miembros] = useLocalStorageState<Miembro[]>(PREVIEW_EQUIPO_KEY, MIEMBROS_INICIALES);
  const [rol] = useSessionRole();
  const editable = puedeEditar(rol);
  const [open, setOpen] = useState(false);

  const miembroPorNombre = new Map(miembros.map((m) => [m.nombre, m]));
  const responsablesDisponibles = miembros.filter((m) => m.rol !== "viewer");
  const propietario = miembros.find((m) => m.rol === "owner");
  const [googleConectado] = useGoogleConnection();

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Tipo>("reunion");
  const [dia, setDia] = useState(1);
  const [hora, setHora] = useState("10:00");
  const [responsable, setResponsable] = useState(responsablesDisponibles[0]?.nombre ?? "");

  // Detalle / edición de un evento existente
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [eventoDetalleId, setEventoDetalleId] = useState<string | null>(null);
  const [tituloD, setTituloD] = useState("");
  const [tipoD, setTipoD] = useState<Tipo>("reunion");
  const [diaD, setDiaD] = useState(1);
  const [horaD, setHoraD] = useState("10:00");
  const [responsableD, setResponsableD] = useState("");

  const cells = [...Array(LEADING_BLANKS).fill(null), ...Array.from({ length: DIAS_MES }, (_, i) => i + 1)];
  const eventosPorDia = new Map<number, Evento[]>();
  for (const e of eventos) {
    eventosPorDia.set(e.dia, [...(eventosPorDia.get(e.dia) ?? []), e]);
  }

  function abrirNuevoEvento(diaClic: number) {
    if (!editable) return;
    setDia(diaClic);
    setOpen(true);
  }

  // Simula Google Calendar + el correo de aviso: el propietario recibe
  // todos los eventos, el responsable asignado solo el suyo, y el
  // remitente siempre es el correo del propietario.
  function notificarEvento(evento: { titulo: string; dia: number; hora: string; responsable: string }) {
    if (!propietario) return;
    const asignado = miembroPorNombre.get(evento.responsable);
    const destinatarios = [
      propietario,
      asignado && asignado.correo !== propietario.correo ? asignado : null,
    ].filter((m): m is Miembro => Boolean(m));

    if (googleConectado) {
      toast.success("Agendado en Google Calendar", {
        description: `Invitación enviada a: ${destinatarios.map((m) => m.correo).join(", ")}.`,
      });
    } else {
      toast("Google Calendar no está conectado", {
        description: "Conéctalo en Equipo para agendar el evento automáticamente ahí también.",
      });
    }

    destinatarios.forEach((m) => {
      toast(`📧 Correo enviado a ${m.correo}`, {
        description: `Desde la bandeja de envío de ${propietario.correo} · Asunto: "${evento.titulo} — EditFlow" · ${fechaLabel(evento.dia)} a las ${evento.hora}.`,
      });
    });
  }

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || !titulo.trim()) return;

    const nuevo: Evento = {
      id: crypto.randomUUID(),
      dia,
      titulo: titulo.trim(),
      tipo,
      hora,
      responsable,
    };
    setEventos((prev) => [...prev, nuevo].sort((a, b) => a.dia - b.dia));
    setOpen(false);
    setTitulo("");
    toast.success(`Evento creado para el ${fechaLabel(dia)}`);
    notificarEvento(nuevo);
  }

  function abrirDetalle(evento: Evento, e?: React.SyntheticEvent) {
    e?.stopPropagation();
    setEventoDetalleId(evento.id);
    setTituloD(evento.titulo);
    setTipoD(evento.tipo);
    setDiaD(evento.dia);
    setHoraD(evento.hora);
    setResponsableD(evento.responsable);
    setDetalleOpen(true);
  }

  function handleGuardarDetalle(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || !eventoDetalleId || !tituloD.trim()) return;
    const actualizado = { titulo: tituloD.trim(), tipo: tipoD, dia: diaD, hora: horaD, responsable: responsableD };
    setEventos((prev) =>
      prev
        .map((ev) => (ev.id === eventoDetalleId ? { ...ev, ...actualizado } : ev))
        .sort((a, b) => a.dia - b.dia),
    );
    setDetalleOpen(false);
    toast.success("Evento actualizado");
    notificarEvento(actualizado);
  }

  function handleEliminarDetalle() {
    if (!editable || !eventoDetalleId) return;
    setEventos((prev) => prev.filter((ev) => ev.id !== eventoDetalleId));
    setDetalleOpen(false);
    toast.success("Evento eliminado");
  }

  const proximos = [...eventos].sort((a, b) => a.dia - b.dia).slice(0, 6);

  return (
    <PreviewShell active="Calendario">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">Calendario</h1>
            <p className="text-sm text-muted-foreground">
              {MES_ACTIVO_LABEL} · Clic en una fecha vacía para crear un evento, o en un evento para ver su detalle
            </p>
          </div>
          <div className="flex items-center gap-2">
            {googleConectado ? (
              <Badge variant="outline" className="gap-1 border-success/40 text-success">
                <CalendarCheck2 className="size-3.5" />
                Google Calendar conectado
              </Badge>
            ) : (
              <Link href="/preview/equipo">
                <Badge variant="outline" className="gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary">
                  <CalendarCheck2 className="size-3.5" />
                  Conectar Google Calendar
                </Badge>
              </Link>
            )}
            <Button
              className="glow-primary"
              onClick={() => abrirNuevoEvento(dia)}
              disabled={!editable}
              title={!editable ? "Estratega: solo lectura en Calendario" : undefined}
            >
              <Plus className="size-4" />
              Nuevo evento
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur">
            <div className="grid grid-cols-7 border-b border-border/60">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="border-r border-border/40 p-2 text-center font-mono text-xs uppercase text-muted-foreground last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const eventosDelDia = day ? eventosPorDia.get(day) ?? [] : [];
                const puedeCrear = Boolean(day) && editable;
                return (
                  // No es <button>: cada evento adentro ya es un botón (abre su
                  // detalle), y un <button> no puede contener otro <button>.
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
                    className={`min-h-24 space-y-1 border-b border-r border-border/40 p-2 text-left last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                      puedeCrear ? "cursor-pointer transition-colors hover:bg-primary/5" : ""
                    }`}
                  >
                    {day && (
                      <>
                        <span className="font-mono text-xs text-muted-foreground">{day}</span>
                        {eventosDelDia.map((evento) => {
                          const style = TIPO_STYLE[evento.tipo];
                          return (
                            <button
                              type="button"
                              key={evento.id}
                              onClick={(e) => abrirDetalle(evento, e)}
                              className={`flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] transition-opacity hover:opacity-80 ${style.className}`}
                            >
                              <style.icon className="size-3 shrink-0" />
                              <span className="truncate">{evento.titulo}</span>
                              <ResponsableAvatar nombre={evento.responsable} miembro={miembroPorNombre.get(evento.responsable)} />
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
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold">Próximos eventos</h3>
              <div className="mt-3 space-y-3">
                {proximos.map((evento) => {
                  const style = TIPO_STYLE[evento.tipo];
                  return (
                    <button
                      type="button"
                      key={evento.id}
                      onClick={() => abrirDetalle(evento)}
                      className="flex w-full items-start gap-2 rounded-md text-left transition-colors hover:bg-muted/40"
                    >
                      <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${style.className}`}>
                        <style.icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{evento.titulo}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {fechaLabel(evento.dia)} · {evento.hora}
                        </p>
                      </div>
                      <ResponsableAvatar nombre={evento.responsable} miembro={miembroPorNombre.get(evento.responsable)} />
                    </button>
                  );
                })}
                {proximos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold">Sincronizado con Monitoreo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Cada video con fecha de entrega aparece aquí automáticamente, sin duplicar datos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo evento — {fechaLabel(dia)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrear} className="space-y-4">
            <EventoCamposForm
              titulo={titulo}
              setTitulo={setTitulo}
              tipo={tipo}
              setTipo={setTipo}
              responsable={responsable}
              setResponsable={setResponsable}
              dia={dia}
              setDia={setDia}
              hora={hora}
              setHora={setHora}
              responsablesDisponibles={responsablesDisponibles}
              disabled={!editable}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="glow-primary" disabled={!editable}>Crear evento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editable ? "Detalle del evento" : tituloD}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarDetalle} className="space-y-4">
            <EventoCamposForm
              titulo={tituloD}
              setTitulo={setTituloD}
              tipo={tipoD}
              setTipo={setTipoD}
              responsable={responsableD}
              setResponsable={setResponsableD}
              dia={diaD}
              setDia={setDiaD}
              hora={horaD}
              setHora={setHoraD}
              responsablesDisponibles={responsablesDisponibles}
              disabled={!editable}
            />
            <DialogFooter>
              {editable ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger hover:text-danger sm:mr-auto"
                    onClick={handleEliminarDetalle}
                  >
                    Eliminar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDetalleOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="glow-primary">Guardar cambios</Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => setDetalleOpen(false)}>Cerrar</Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PreviewShell>
  );
}
