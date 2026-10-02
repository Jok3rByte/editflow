import { parse } from "date-fns";

export type VideoEstado = "pendiente" | "edicion" | "en_revision" | "aprobado";

export function parseFechaDDMMYYYY(fecha: string): Date {
  return parse(fecha, "dd/MM/yyyy", new Date());
}

export interface VideoSeed {
  id: string;
  seq: number;
  cliente: string;
  titulo: string;
  encargado: string; // nombre del miembro del equipo, o "—"
  inicio: string; // DD/MM/AAAA
  entrega: string; // DD/MM/AAAA
  estado: VideoEstado;
  link: string | null;
  atrasado: boolean;
  // Medidor de avance de edición: lo actualiza el editor a mano (10-100).
  // Solo corre mientras estado === "edicion" — en cualquier otro estado no
  // suma tiempo ni se puede editar.
  progreso: number;
  progresoInicioISO: string | null; // cuándo entró a "edicion" la última vez
  alertaEnviada: boolean; // evita repetir el aviso mientras sigue estancado
}

// Rango del medidor y umbrales de alerta por demora — dos niveles:
// "sin_arrancar" (1h en edición y sigue en el mínimo, ni se movió) avisa de
// una; "estancado" (mucho tiempo con un % todavía bajo, 30-50%) avisa más
// tarde porque ahí sí hubo algo de avance. Los dos van al editor y al
// propietario, con sonido y todo en rojo.
export const PROGRESO_MIN = 10;
export const PROGRESO_MAX = 100;
export const PROGRESO_PASO = 10;
export const PROGRESO_BAJO_MIN = 30;
export const PROGRESO_BAJO_MAX = 50;
export const ALERTA_HORAS_UMBRAL = 4;
export const ALERTA_SIN_ARRANCAR_HORAS = 1;

export function horasEnEdicion(progresoInicioISO: string | null): number {
  if (!progresoInicioISO) return 0;
  return (Date.now() - new Date(progresoInicioISO).getTime()) / 3_600_000;
}

export type TipoAlerta = "sin_arrancar" | "estancado";

export function calcularAlerta(
  video: Pick<VideoSeed, "estado" | "progreso" | "progresoInicioISO">,
): TipoAlerta | null {
  if (video.estado !== "edicion") return null;
  const horas = horasEnEdicion(video.progresoInicioISO);

  if (horas >= ALERTA_SIN_ARRANCAR_HORAS && video.progreso <= PROGRESO_MIN) return "sin_arrancar";
  if (
    horas >= ALERTA_HORAS_UMBRAL &&
    video.progreso >= PROGRESO_BAJO_MIN &&
    video.progreso <= PROGRESO_BAJO_MAX
  ) {
    return "estancado";
  }
  return null;
}

export function debeAlertar(video: Pick<VideoSeed, "estado" | "progreso" | "progresoInicioISO">): boolean {
  return calcularAlerta(video) !== null;
}

// Psicología del color, en degradado continuo — no en 3 bloques fijos:
// rojo puro en 0% (urgencia, hay que actuar), pasa por amarillo justo a la
// mitad (punto neutro), y llega a verde puro en 100% (tranquilidad, hecho).
// Hue 0°=rojo, 60°=amarillo, 120°=verde: interpolar el hue linealmente con
// el % hace que 50% caiga exacto en amarillo.
export function huePorProgreso(progreso: number): number {
  const p = Math.max(0, Math.min(100, progreso));
  return (p / 100) * 120;
}

export function colorPorProgreso(progreso: number): string {
  const p = Math.max(0, Math.min(100, progreso));
  // Además del tono, la saturación sube y la luz baja un poco a medida que
  // se acerca al 100% — así el verde final se ve fuerte y vivo, no un
  // pastel apagado igual de intenso que el resto del degradado.
  const saturacion = 65 + (p / 100) * 25;
  const luminosidad = 48 - (p / 100) * 8;
  return `hsl(${huePorProgreso(p)}, ${saturacion}%, ${luminosidad}%)`;
}

// Degradado de dos tonos centrado en el % actual, para que la barra tenga
// textura (no un bloque sólido) sin perder la lectura inmediata del color:
// el extremo derecho (el borde de avance) siempre es el color exacto del %.
export function gradientePorProgreso(progreso: number): string {
  const inicio = colorPorProgreso(Math.max(0, progreso - 20));
  const fin = colorPorProgreso(progreso);
  return `linear-gradient(90deg, ${inicio}, ${fin})`;
}

export const PREVIEW_VIDEOS_KEY = "editflow_preview_videos";

export const CLIENTES = ["Caicedo", "Editor Pro", "Cantaso Studio", "Informativo Burrito"];

export const CLIENTES_METAS: Record<string, number> = {
  Caicedo: 12,
  "Editor Pro": 8,
  "Cantaso Studio": 10,
  "Informativo Burrito": 20,
};

// Los 6 videos exactos de OCTUBRE 2025 en supabase/seed.sql. v4 y v5
// arrancan con horas "en edición" ya cargadas (respecto al momento en que
// carga la app) solo para que las dos alertas se vean funcionando de una,
// sin tener que esperar horas reales: v4 lleva 5h estancado en 40% (avisa
// por demora); v5 lleva 1.5h sin moverse del 10% (avisa porque ni arrancó).
export const VIDEOS_INICIALES: VideoSeed[] = [
  { id: "v1", seq: 1, cliente: "Caicedo", titulo: "Reel Campus Caicedo", encargado: "Zax", inicio: "01/10/2025", entrega: "02/10/2025", estado: "aprobado", link: null, atrasado: false, progreso: 100, progresoInicioISO: null, alertaEnviada: false },
  { id: "v2", seq: 1, cliente: "Editor Pro", titulo: "Reel pack editor pro", encargado: "Zax", inicio: "02/10/2025", entrega: "02/10/2025", estado: "aprobado", link: "https://f.io/IyZiGO-k", atrasado: false, progreso: 100, progresoInicioISO: null, alertaEnviada: false },
  { id: "v3", seq: 1, cliente: "Cantaso Studio", titulo: "Comercial Chivo Loco", encargado: "Lian", inicio: "03/10/2025", entrega: "08/10/2025", estado: "en_revision", link: null, atrasado: true, progreso: 100, progresoInicioISO: null, alertaEnviada: false },
  { id: "v4", seq: 2, cliente: "Caicedo", titulo: "Acueducto banco y mar", encargado: "Diego", inicio: "03/10/2025", entrega: "04/10/2025", estado: "edicion", link: null, atrasado: true, progreso: 40, progresoInicioISO: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), alertaEnviada: false },
  { id: "v5", seq: 1, cliente: "Informativo Burrito", titulo: "Reel 1", encargado: "Zax", inicio: "01/10/2025", entrega: "01/10/2025", estado: "edicion", link: null, atrasado: true, progreso: PROGRESO_MIN, progresoInicioISO: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), alertaEnviada: false },
  { id: "v6", seq: 2, cliente: "Informativo Burrito", titulo: "Reel 2", encargado: "—", inicio: "01/10/2025", entrega: "01/10/2025", estado: "pendiente", link: null, atrasado: true, progreso: PROGRESO_MIN, progresoInicioISO: null, alertaEnviada: false },
];

export const ESTADOS: Record<VideoEstado, { label: string; dot: string; text: string; bg: string }> = {
  pendiente: { label: "Pendiente", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40" },
  edicion: { label: "Edición", dot: "bg-info shadow-[0_0_8px_var(--info)]", text: "text-info", bg: "bg-info/10" },
  en_revision: { label: "En revisión", dot: "bg-warning shadow-[0_0_8px_var(--warning)]", text: "text-warning", bg: "bg-warning/10" },
  aprobado: { label: "Aprobado", dot: "bg-success shadow-[0_0_8px_var(--success)]", text: "text-success", bg: "bg-success/10" },
};
