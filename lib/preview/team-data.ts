export type Rol = "owner" | "admin" | "editor" | "viewer";

export interface Miembro {
  nombre: string;
  correo: string;
  rol: Rol;
  estado: "Activo" | "Invitado";
  color: string;
  foto?: string; // data URL (base64) subida por el usuario
  icono?: string; // emoji — alternativa a la foto cuando no hay una
}

export const PREVIEW_EQUIPO_KEY = "editflow_preview_equipo";

// Paleta de colores para representar personas — distinta de los colores de
// estado (verde/ámbar/azul/rojo) para no confundirlas.
export const COLOR_PALETTE = [
  "#8B5CF6", // violeta
  "#06B6D4", // cian
  "#F59E0B", // ámbar
  "#10B981", // verde
  "#EC4899", // rosa
  "#3B82F6", // azul
  "#F97316", // naranja
  "#EF4444", // rojo
];

// Iconos rápidos para representar a alguien sin subir una foto.
export const AVATAR_ICONS = [
  "🎬", "🎨", "🎯", "⚡", "🚀", "🔥", "🎧", "✂️", "📽️", "🖥️", "🌟", "🎮",
];

// Miembros exactos de supabase/seed.sql, con un color asignado por defecto.
export const MIEMBROS_INICIALES: Miembro[] = [
  { nombre: "Lean Productor", correo: "lean@correo.com", rol: "owner", estado: "Activo", color: "#8B5CF6" },
  { nombre: "Zax", correo: "zax@productoralean.com", rol: "editor", estado: "Activo", color: "#06B6D4" },
  { nombre: "Lian", correo: "lian@productoralean.com", rol: "editor", estado: "Activo", color: "#F59E0B" },
  { nombre: "Diego", correo: "diego@productoralean.com", rol: "editor", estado: "Activo", color: "#10B981" },
];

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}
