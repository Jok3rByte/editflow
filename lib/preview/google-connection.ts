import { useLocalStorageState } from "./use-local-storage-state";

export const PREVIEW_GOOGLE_KEY = "editflow_preview_google_conectado";

// Simula la conexión de Google Calendar del propietario — el mismo correo
// con el que se registró. Se guarda en local para que Equipo y Calendario
// vean el mismo estado sin backend real.
export function useGoogleConnection() {
  return useLocalStorageState<boolean>(PREVIEW_GOOGLE_KEY, false);
}
