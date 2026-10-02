export interface PreviewCliente {
  id: string;
  nombre: string;
  marca: string;
  industria: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  descripcion: string;
  publicoObjetivo: string;
  tono: string;
  noHacer: string;
  encargado: string;
  meta: number;
  notas: string;
  // Métricas del mes activo (calculadas en la app real por v_client_summary)
  finalizados: number;
  total: number;
  enCurso: number;
  alcanceMeta: number;
  atrasados: number;
}

export const PREVIEW_CLIENTES_KEY = "editflow_preview_clientes";

// Números exactos calculados de supabase/seed.sql para el periodo OCTUBRE 2025.
export const CLIENTES_INICIALES: PreviewCliente[] = [
  {
    id: "caicedo",
    nombre: "Caicedo",
    marca: "",
    industria: "",
    contactoNombre: "",
    contactoEmail: "",
    contactoTelefono: "",
    descripcion: "",
    publicoObjetivo: "",
    tono: "",
    noHacer: "",
    encargado: "Productora",
    meta: 12,
    notas: "",
    finalizados: 1,
    total: 2,
    enCurso: 1,
    alcanceMeta: 8.3,
    atrasados: 1,
  },
  {
    id: "editor-pro",
    nombre: "Editor Pro",
    marca: "",
    industria: "",
    contactoNombre: "",
    contactoEmail: "",
    contactoTelefono: "",
    descripcion: "",
    publicoObjetivo: "",
    tono: "",
    noHacer: "",
    encargado: "Productora",
    meta: 8,
    notas: "",
    finalizados: 1,
    total: 1,
    enCurso: 0,
    alcanceMeta: 12.5,
    atrasados: 0,
  },
  {
    id: "cantaso",
    nombre: "Cantaso Studio",
    marca: "",
    industria: "",
    contactoNombre: "",
    contactoEmail: "",
    contactoTelefono: "",
    descripcion: "",
    publicoObjetivo: "",
    tono: "",
    noHacer: "",
    encargado: "Productora",
    meta: 10,
    notas: "",
    finalizados: 0,
    total: 1,
    enCurso: 1,
    alcanceMeta: 0,
    atrasados: 1,
  },
  {
    id: "burrito",
    nombre: "Informativo Burrito",
    marca: "",
    industria: "",
    contactoNombre: "",
    contactoEmail: "",
    contactoTelefono: "",
    descripcion: "",
    publicoObjetivo: "",
    tono: "",
    noHacer: "",
    encargado: "Productora",
    meta: 20,
    notas: "",
    finalizados: 0,
    total: 2,
    enCurso: 0,
    alcanceMeta: 0,
    atrasados: 2,
  },
];

export const CARTERA_INACTIVA = [
  { id: "cafe-roble", nombre: "Café Roble", meta: 6 },
  { id: "nova-fit", nombre: "Nova Fit", meta: 15 },
];
