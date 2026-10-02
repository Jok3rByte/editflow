"use client";

import { useEffect, useState } from "react";

/**
 * Estado persistido en localStorage para el modo Vista Previa (sin backend).
 * `hydrated` evita parpadeos: solo se pinta con el valor guardado tras montar en cliente.
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw) as T);
    } catch {
      // localStorage no disponible (privado/bloqueado): seguimos con el valor inicial.
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Igual, sin bloquear la UI si no se puede guardar.
    }
  }, [key, state, hydrated]);

  return [state, setState, hydrated] as const;
}
