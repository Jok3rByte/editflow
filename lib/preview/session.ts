"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import type { Rol } from "./team-data";

export const PREVIEW_SESSION_KEY = "editflow_preview_sesion_rol";

export const ROL_LABEL: Record<Rol, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega",
};

export function useSessionRole() {
  return useLocalStorageState<Rol>(PREVIEW_SESSION_KEY, "owner");
}

// El Estratega (rol "viewer") es de solo lectura en toda la app. La única
// excepción es la gestión de clientes: puede registrar clientes nuevos,
// activar clientes existentes y editar su brief — por eso Clientes no usa
// este helper para bloquear nada.
export function puedeEditar(rol: Rol): boolean {
  return rol !== "viewer";
}
