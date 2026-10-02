"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ExternalLink,
  GripVertical,
  LayoutGrid,
  Pencil,
  Plus,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PreviewShell } from "@/components/preview/preview-shell";
import { DatePickerField } from "@/components/preview/date-picker-field";
import { MemberAvatar } from "@/components/preview/member-avatar";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import { playAlertSound, playSuccessSound } from "@/lib/preview/notification-sounds";
import { cn } from "@/lib/utils";
import { MIEMBROS_INICIALES, PREVIEW_EQUIPO_KEY, type Miembro } from "@/lib/preview/team-data";
import { puedeEditar, useSessionRole } from "@/lib/preview/session";
import {
  ALERTA_HORAS_UMBRAL,
  ALERTA_SIN_ARRANCAR_HORAS,
  calcularAlerta,
  CLIENTES,
  debeAlertar,
  ESTADOS,
  gradientePorProgreso,
  horasEnEdicion,
  parseFechaDDMMYYYY,
  PREVIEW_VIDEOS_KEY,
  PROGRESO_MAX,
  PROGRESO_MIN,
  PROGRESO_PASO,
  VIDEOS_INICIALES,
  type VideoEstado,
  type VideoSeed,
} from "@/lib/preview/monitoring-data";

const KANBAN_COLUMNS: VideoEstado[] = ["pendiente", "edicion", "en_revision", "aprobado"];
const TODOS = "__todos__";

// Mes ("MM") y año ("yyyy") de entrega de un video — se filtran por
// separado, agrupando por la fecha de entrega igual que el resto de la app.
function mesDeVideo(v: VideoSeed) {
  return format(parseFechaDDMMYYYY(v.entrega), "MM");
}
function anoDeVideo(v: VideoSeed) {
  return format(parseFechaDDMMYYYY(v.entrega), "yyyy");
}
function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function EncargadoBadge({ nombre, miembro }: { nombre: string; miembro?: Miembro }) {
  if (nombre === "—") {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <MemberAvatar
        nombre={nombre}
        color={miembro?.color ?? "#6B7280"}
        foto={miembro?.foto}
        icono={miembro?.icono}
        className="size-4"
        textClassName="text-[8px]"
      />
      <span className="truncate">{nombre}</span>
    </span>
  );
}

function EncargadoSelect({
  value,
  onChange,
  encargados,
  miembroPorNombre,
  className,
  disabled,
}: {
  value: string;
  onChange: (nuevoEncargado: string) => void;
  encargados: string[];
  miembroPorNombre: Map<string, Miembro>;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className={cn("h-7 border-none bg-transparent px-1.5", className)}>
        <EncargadoBadge nombre={value} miembro={miembroPorNombre.get(value)} />
      </SelectTrigger>
      {/* position="popper": el trigger no usa <SelectValue />, así que el
          modo "item-aligned" (default) no puede calcular su posición y el
          menú termina en la esquina superior de la página. */}
      <SelectContent position="popper">
        {encargados.map((en) => (
          <SelectItem key={en} value={en}>
            <EncargadoBadge nombre={en} miembro={miembroPorNombre.get(en)} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LinkCell({
  link,
  onSave,
  disabled,
}: {
  link: string | null;
  onSave: (link: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(link ?? "");

  function handleOpenChange(nextOpen: boolean) {
    if (disabled) return;
    if (nextOpen) setValor(link ?? "");
    setOpen(nextOpen);
  }

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    onSave(valor.trim() || null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className="flex items-center gap-1.5">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver video <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        {!disabled && (
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-foreground"
              title={link ? "Editar link" : "Agregar link"}
            >
              <Pencil className="size-3" />
            </button>
          </PopoverTrigger>
        )}
      </div>
      <PopoverContent className="w-72" align="start">
        <form onSubmit={handleGuardar} className="space-y-2">
          <Label htmlFor="p-link-cell" className="text-xs">Link del video</Label>
          <Input
            id="p-link-cell"
            placeholder="Pega cualquier link (Drive, Frame.io, YouTube...)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm">Guardar</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// Medidor de avance de edición: solo corre (y se puede editar) mientras el
// video está en "edicion". En cualquier otro estado se ve congelado — "no
// suma" — tal como pidieron.
function ProgresoCell({
  video,
  onChange,
  disabled,
  className,
}: {
  video: VideoSeed;
  onChange: (nuevoProgreso: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const activo = video.estado === "edicion";
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(video.progreso);
  const alerta = debeAlertar(video);
  const horas = Math.floor(horasEnEdicion(video.progresoInicioISO));
  const puedeEditarValor = activo && !disabled;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o && !puedeEditarValor) return;
        if (o) setValor(video.progreso);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild disabled={!puedeEditarValor}>
        <button
          type="button"
          disabled={!puedeEditarValor}
          className={cn(
            "flex w-32 flex-col gap-1 rounded-md px-1.5 py-1 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default",
            alerta && "animate-pulse-slow bg-danger/10 ring-1 ring-danger/50",
            className,
          )}
        >
          <div className="flex items-center gap-1.5">
            <Progress
              value={video.progreso}
              className={cn("h-1.5", !activo && "opacity-40")}
              indicatorStyle={{ background: gradientePorProgreso(video.progreso) }}
            />
            <span
              className={cn(
                "w-8 shrink-0 font-mono text-[11px] tabular-nums",
                alerta ? "font-semibold text-danger" : "text-muted-foreground",
              )}
            >
              {video.progreso}%
            </span>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 text-[10px]",
              alerta ? "font-medium text-danger" : "text-muted-foreground",
            )}
          >
            {alerta && <AlertTriangle className="size-2.5 shrink-0" />}
            {activo ? `${horas <= 0 ? "hace instantes" : `${horas}h`} en edición` : "no suma"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Avance de edición</Label>
            <span className="font-mono text-sm font-semibold">{valor}%</span>
          </div>
          <Slider
            value={[valor]}
            min={PROGRESO_MIN}
            max={PROGRESO_MAX}
            step={PROGRESO_PASO}
            onValueChange={([v]) => setValor(v)}
          />
          {valor <= PROGRESO_MIN && (
            <p className="text-[11px] text-muted-foreground">
              Si no se mueve de acá en {ALERTA_SIN_ARRANCAR_HORAS}h, se avisa de una (con sonido) al
              editor y al propietario.
            </p>
          )}
          {valor >= 30 && valor <= 50 && (
            <p className="text-[11px] text-muted-foreground">
              Si se queda acá {ALERTA_HORAS_UMBRAL}h o más, se avisa al editor y al propietario.
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => {
              onChange(valor);
              setOpen(false);
            }}
          >
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function MonitoreoPreviewPage() {
  const [videos, setVideos] = useLocalStorageState<VideoSeed[]>(PREVIEW_VIDEOS_KEY, VIDEOS_INICIALES);
  const [miembros] = useLocalStorageState<Miembro[]>(PREVIEW_EQUIPO_KEY, MIEMBROS_INICIALES);
  const [rol] = useSessionRole();
  const editable = puedeEditar(rol);
  const [view, setView] = useState<"tabla" | "kanban">("tabla");
  const [open, setOpen] = useState(false);
  const [videoAEliminar, setVideoAEliminar] = useState<VideoSeed | null>(null);

  const editores = miembros.filter((m) => m.rol === "editor" || m.rol === "admin" || m.rol === "owner");
  const miembroPorNombre = new Map(miembros.map((m) => [m.nombre, m]));
  const ENCARGADOS = ["—", ...editores.map((m) => m.nombre)];

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState(TODOS);
  const [filtroEncargado, setFiltroEncargado] = useState(TODOS);
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [filtroMes, setFiltroMes] = useState(TODOS);
  const [filtroAno, setFiltroAno] = useState(TODOS);

  const mesesDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const v of videos) {
      const key = mesDeVideo(v);
      if (!mapa.has(key)) {
        mapa.set(key, capitalizar(format(parseFechaDDMMYYYY(v.entrega), "MMMM", { locale: es })));
      }
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [videos]);

  const anosDisponibles = useMemo(() => {
    const set = new Set(videos.map(anoDeVideo));
    return [...set].sort();
  }, [videos]);

  const videosFiltrados = useMemo(
    () =>
      videos.filter(
        (v) =>
          (filtroCliente === TODOS || v.cliente === filtroCliente) &&
          (filtroEncargado === TODOS || v.encargado === filtroEncargado) &&
          (filtroEstado === TODOS || v.estado === filtroEstado) &&
          (filtroMes === TODOS || mesDeVideo(v) === filtroMes) &&
          (filtroAno === TODOS || anoDeVideo(v) === filtroAno),
      ),
    [videos, filtroCliente, filtroEncargado, filtroEstado, filtroMes, filtroAno],
  );

  const hayFiltrosActivos =
    filtroCliente !== TODOS ||
    filtroEncargado !== TODOS ||
    filtroEstado !== TODOS ||
    filtroMes !== TODOS ||
    filtroAno !== TODOS;

  function limpiarFiltros() {
    setFiltroCliente(TODOS);
    setFiltroEncargado(TODOS);
    setFiltroEstado(TODOS);
    setFiltroMes(TODOS);
    setFiltroAno(TODOS);
  }

  // Formulario "Agregar video"
  const [cliente, setCliente] = useState(CLIENTES[0]);
  const [titulo, setTitulo] = useState("");
  const [encargado, setEncargado] = useState("—");
  const [inicioDate, setInicioDate] = useState<Date>(new Date());
  const [entregaDate, setEntregaDate] = useState<Date>(new Date());
  const [link, setLink] = useState("");

  function handleEstadoChange(id: string, estado: VideoEstado) {
    if (!editable) return;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        // El medidor de avance arranca (o reinicia) justo cuando el video
        // vuelve a marcarse "edicion" — en cualquier otro estado no suma.
        const entrandoAEdicion = estado === "edicion" && v.estado !== "edicion";
        return {
          ...v,
          estado,
          atrasado: estado === "aprobado" ? false : v.atrasado,
          progreso: entrandoAEdicion ? Math.max(v.progreso, PROGRESO_MIN) : v.progreso,
          progresoInicioISO: entrandoAEdicion ? new Date().toISOString() : v.progresoInicioISO,
          alertaEnviada: entrandoAEdicion ? false : v.alertaEnviada,
        };
      }),
    );
    toast.success(`Estado actualizado a "${ESTADOS[estado].label}"`);
  }

  function handleProgresoChange(id: string, nuevoProgreso: number) {
    if (!editable) return;
    const anterior = videos.find((v) => v.id === id);
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, progreso: nuevoProgreso, alertaEnviada: false } : v)),
    );

    if (nuevoProgreso === PROGRESO_MAX && anterior && anterior.progreso !== PROGRESO_MAX) {
      playSuccessSound();
      const propietario = miembros.find((m) => m.rol === "owner");
      toast.success(`🎉 "${anterior.titulo}" llegó al 100%`, {
        description: `Notificación de video terminado enviada a ${
          anterior.encargado !== "—" ? anterior.encargado : "el editor"
        } y a ${propietario?.nombre ?? "el propietario"}.`,
      });
      return;
    }

    toast.success(`Avance actualizado a ${nuevoProgreso}%`);
  }

  // Revisa cada minuto (y al entrar) si algún video necesita una alerta roja
  // — ni arrancó (1h en edición sin pasar del 10%) o se estancó (mucho
  // tiempo entre 30-50%). Si es así, avisa de una con sonido, una sola vez
  // (hasta que el editor actualice su avance o cambie el estado).
  useEffect(() => {
    function revisarAlertas() {
      setVideos((prev) => {
        let cambio = false;
        const actualizados = prev.map((v) => {
          if (v.alertaEnviada) return v;
          const tipo = calcularAlerta(v);
          if (!tipo) return v;
          cambio = true;
          playAlertSound();
          const horas = Math.floor(horasEnEdicion(v.progresoInicioISO));
          const propietario = miembros.find((m) => m.rol === "owner");
          const destinatarios = `${v.encargado !== "—" ? v.encargado : "el editor"} y a ${propietario?.nombre ?? "el propietario"}`;
          if (tipo === "sin_arrancar") {
            toast.error(`🚨 "${v.titulo}" lleva ${horas}h en edición sin pasar del ${PROGRESO_MIN}%`, {
              description: `Aún no arranca — alerta enviada a ${destinatarios}.`,
            });
          } else {
            toast.error(`🚨 "${v.titulo}" lleva ${horas}h en edición al ${v.progreso}%`, {
              description: `Aviso de demora enviado a ${destinatarios}.`,
            });
          }
          return { ...v, alertaEnviada: true };
        });
        return cambio ? actualizados : prev;
      });
    }

    revisarAlertas();
    const id = setInterval(revisarAlertas, 60_000);
    return () => clearInterval(id);
  }, [miembros, setVideos]);

  function handleEncargadoChange(id: string, nuevoEncargado: string) {
    if (!editable) return;
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, encargado: nuevoEncargado } : v)));
    toast.success(
      nuevoEncargado === "—" ? "Video sin asignar" : `Video asignado a ${nuevoEncargado}`,
    );
  }

  function handleLinkChange(id: string, nuevoLink: string | null) {
    if (!editable) return;
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, link: nuevoLink } : v)));
    toast.success(nuevoLink ? "Link guardado" : "Link eliminado");
  }

  function handleEliminarVideo() {
    if (!editable || !videoAEliminar) return;
    setVideos((prev) => prev.filter((v) => v.id !== videoAEliminar.id));
    toast.success(`Video "${videoAEliminar.titulo}" eliminado`);
    setVideoAEliminar(null);
  }

  function handleInicioChange(id: string, date: Date) {
    if (!editable) return;
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, inicio: format(date, "dd/MM/yyyy") } : v)),
    );
    toast.success("Fecha de inicio actualizada");
  }

  function handleEntregaChange(id: string, date: Date) {
    if (!editable) return;
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              entrega: format(date, "dd/MM/yyyy"),
              atrasado: v.estado === "aprobado" ? false : isBefore(date, startOfDay(new Date())),
            }
          : v,
      ),
    );
    toast.success("Fecha de entrega actualizada");
  }

  // Arrastrar y soltar en el Kanban
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<VideoEstado | null>(null);

  function handleCardDragStart(e: React.DragEvent, id: string) {
    if (!editable) {
      e.preventDefault();
      return;
    }
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleCardDragEnd() {
    setDraggingId(null);
    setDragOverCol(null);
  }

  function handleColumnDrop(e: React.DragEvent, estado: VideoEstado) {
    e.preventDefault();
    if (!editable) return;
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    setDragOverCol(null);
    if (!id) return;
    const video = videos.find((v) => v.id === id);
    if (!video || video.estado === estado) return;
    handleEstadoChange(id, estado);
  }

  function abrirAgregar() {
    setCliente(CLIENTES[0]);
    setTitulo("");
    setEncargado("—");
    setInicioDate(new Date());
    setEntregaDate(new Date());
    setLink("");
    setOpen(true);
  }

  function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || !titulo.trim()) return;

    const seq = videos.filter((v) => v.cliente === cliente).length + 1;
    const nuevo: VideoSeed = {
      id: crypto.randomUUID(),
      seq,
      cliente,
      titulo: titulo.trim(),
      encargado,
      inicio: format(inicioDate, "dd/MM/yyyy"),
      entrega: format(entregaDate, "dd/MM/yyyy"),
      estado: "pendiente",
      link: link.trim() || null,
      atrasado: false,
      progreso: PROGRESO_MIN,
      progresoInicioISO: null,
      alertaEnviada: false,
    };
    setVideos((prev) => [...prev, nuevo]);
    setOpen(false);
    toast.success(`Video #${seq} agregado a ${cliente}`);
  }

  return (
    <PreviewShell active="Monitoreo">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">Monitoreo</h1>
            <p className="text-sm text-muted-foreground">
              {filtroMes === TODOS && filtroAno === TODOS
                ? "Todos los periodos"
                : [mesesDisponibles.find(([key]) => key === filtroMes)?.[1], filtroAno !== TODOS ? filtroAno : null]
                    .filter(Boolean)
                    .join(" ")}
              {" "}· Editor
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-border/60 bg-card/60 p-1 backdrop-blur">
              <button
                onClick={() => setView("tabla")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "tabla" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Table2 className="size-3.5" />
                Tabla
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                Kanban
              </button>
            </div>
            <Button
              className="glow-primary"
              onClick={abrirAgregar}
              disabled={!editable}
              title={!editable ? "Estratega: solo lectura en Monitoreo" : undefined}
            >
              <Plus className="size-4" />
              Agregar video
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 p-3 backdrop-blur">
          <span className="text-xs font-medium text-muted-foreground">Filtrar por:</span>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger size="sm" className="w-[10rem]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los clientes</SelectItem>
              {CLIENTES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEncargado} onValueChange={setFiltroEncargado}>
            <SelectTrigger size="sm" className="w-[10rem]">
              <SelectValue placeholder="Encargado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los encargados</SelectItem>
              {ENCARGADOS.map((en) => (
                <SelectItem key={en} value={en}>{en === "—" ? "Sin asignar" : en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger size="sm" className="w-[10rem]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              {(Object.keys(ESTADOS) as VideoEstado[]).map((key) => (
                <SelectItem key={key} value={key}>{ESTADOS[key].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger size="sm" className="w-[9rem]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los meses</SelectItem>
              {mesesDisponibles.map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger size="sm" className="w-[8rem]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los años</SelectItem>
              {anosDisponibles.map((ano) => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hayFiltrosActivos && (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
              <X className="size-3.5" />
              Limpiar
            </Button>
          )}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {videosFiltrados.length} de {videos.length} videos
          </span>
        </div>

        {view === "tabla" ? (
          <div className="max-h-[calc(100dvh-260px)] min-h-[320px] overflow-auto rounded-xl border border-border/70 bg-card/60 backdrop-blur">
            <table className="w-full min-w-[940px] text-sm">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                <tr className="border-b border-border/60 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Nombre del video</th>
                  <th className="px-3 py-2 text-left">Encargado</th>
                  <th className="px-3 py-2 text-left">Inicio</th>
                  <th className="px-3 py-2 text-left">Entrega</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th
                    className="px-3 py-2 text-left"
                    title="Rojo en 0% (urgencia) → amarillo en 50% → verde en 100% (terminado)"
                  >
                    Progreso
                  </th>
                  <th className="px-3 py-2 text-left">Link</th>
                  <th className="px-3 py-2 text-left" />
                </tr>
              </thead>
              <tbody>
                {videosFiltrados.map((video) => (
                  <tr
                    key={video.id}
                    className={`border-b border-border/40 last:border-b-0 hover:bg-muted/20 ${
                      video.atrasado ? "bg-danger/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-muted-foreground tabular-nums">{video.seq}</td>
                    <td className="px-3 py-2.5 font-medium">{video.cliente}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{video.titulo}</td>
                    <td className="px-3 py-2.5">
                      <EncargadoSelect
                        value={video.encargado}
                        onChange={(v) => handleEncargadoChange(video.id, v)}
                        encargados={ENCARGADOS}
                        miembroPorNombre={miembroPorNombre}
                        className="w-[9.5rem]"
                        disabled={!editable}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <DatePickerField
                        value={parseFechaDDMMYYYY(video.inicio)}
                        onChange={(d) => handleInicioChange(video.id, d)}
                        disabled={!editable}
                        className="h-7 w-[8.5rem] border-none bg-transparent px-1.5 font-mono text-xs text-muted-foreground hover:bg-muted/40"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <DatePickerField
                        value={parseFechaDDMMYYYY(video.entrega)}
                        onChange={(d) => handleEntregaChange(video.id, d)}
                        disabled={!editable}
                        className={cn(
                          "h-7 w-[8.5rem] border-none bg-transparent px-1.5 font-mono text-xs hover:bg-muted/40",
                          video.atrasado ? "font-semibold text-danger" : "text-muted-foreground",
                        )}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={video.estado}
                        onValueChange={(v) => handleEstadoChange(video.id, v as VideoEstado)}
                        disabled={!editable}
                      >
                        <SelectTrigger
                          size="sm"
                          className={`h-7 w-[9.5rem] border-none ${ESTADOS[video.estado].bg} ${ESTADOS[video.estado].text}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${ESTADOS[video.estado].dot}`} />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ESTADOS) as VideoEstado[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              {ESTADOS[key].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2.5">
                      <ProgresoCell
                        video={video}
                        onChange={(p) => handleProgresoChange(video.id, p)}
                        disabled={!editable}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <LinkCell link={video.link} onSave={(l) => handleLinkChange(video.id, l)} disabled={!editable} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        onClick={() => setVideoAEliminar(video)}
                        title="Eliminar video"
                        className="text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {videosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      Ningún video coincide con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KANBAN_COLUMNS.map((col) => {
              const estado = ESTADOS[col];
              const items = videosFiltrados.filter((v) => v.estado === col);
              return (
                <div
                  key={col}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCol(col);
                  }}
                  onDragLeave={() => setDragOverCol((prev) => (prev === col ? null : prev))}
                  onDrop={(e) => handleColumnDrop(e, col)}
                  className={cn(
                    "flex h-[calc(100dvh-260px)] min-h-[320px] flex-col rounded-xl border border-border/70 bg-card/40 p-3 backdrop-blur transition-colors",
                    dragOverCol === col && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
                  )}
                >
                  <div className="mb-3 flex shrink-0 items-center gap-1.5 text-sm font-medium">
                    <span className={`size-2 rounded-full ${estado.dot}`} />
                    {estado.label}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {items.map((v) => (
                      <div
                        key={v.id}
                        draggable={editable}
                        onDragStart={(e) => handleCardDragStart(e, v.id)}
                        onDragEnd={handleCardDragEnd}
                        className={cn(
                          "group/card relative flex items-start gap-2 rounded-lg border border-border/60 bg-card p-3 text-sm",
                          editable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                          v.atrasado && "border-danger/40",
                          draggingId === v.id && "opacity-40",
                        )}
                      >
                        {editable && (
                          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                        )}
                        {editable && (
                          <button
                            type="button"
                            onClick={() => setVideoAEliminar(v)}
                            title="Eliminar video"
                            className="absolute right-2 top-2 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover/card:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                        <p className="pr-4 font-medium">{v.cliente}</p>
                        <p className="text-xs text-muted-foreground">{v.titulo}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <EncargadoSelect
                            value={v.encargado}
                            onChange={(nv) => handleEncargadoChange(v.id, nv)}
                            encargados={ENCARGADOS}
                            miembroPorNombre={miembroPorNombre}
                            className="w-[8rem]"
                            disabled={!editable}
                          />
                          <DatePickerField
                            value={parseFechaDDMMYYYY(v.entrega)}
                            onChange={(d) => handleEntregaChange(v.id, d)}
                            align="end"
                            disabled={!editable}
                            className={cn(
                              "h-6 w-[6.5rem] shrink-0 gap-1 border-none bg-transparent px-1 font-mono text-[11px] hover:bg-muted/40",
                              v.atrasado ? "text-danger" : "text-muted-foreground",
                            )}
                          />
                        </div>
                        {col === "edicion" && (
                          <ProgresoCell
                            video={v}
                            onChange={(p) => handleProgresoChange(v.id, p)}
                            disabled={!editable}
                            className="mt-1.5 w-full"
                          />
                        )}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Sin videos</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar video</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAgregar} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={cliente} onValueChange={setCliente}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENTES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-titulo">Nombre del video *</Label>
              <Input id="p-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Encargado</Label>
              <Select value={encargado} onValueChange={setEncargado}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENCARGADOS.map((en) => (
                    <SelectItem key={en} value={en}>
                      <EncargadoBadge nombre={en} miembro={miembroPorNombre.get(en)} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inicio</Label>
                <DatePickerField value={inicioDate} onChange={setInicioDate} />
              </div>
              <div className="space-y-1.5">
                <Label>Entrega</Label>
                <DatePickerField value={entregaDate} onChange={setEntregaDate} align="end" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-link">Link (opcional)</Label>
              <Input
                id="p-link"
                placeholder="Pega cualquier link (Drive, Frame.io, YouTube...)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="glow-primary">Agregar video</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={videoAEliminar !== null} onOpenChange={(o) => !o && setVideoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este video?</AlertDialogTitle>
            <AlertDialogDescription>
              {videoAEliminar && (
                <>
                  &quot;{videoAEliminar.titulo}&quot; de {videoAEliminar.cliente} se va a eliminar de
                  Monitoreo. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={handleEliminarVideo}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PreviewShell>
  );
}
