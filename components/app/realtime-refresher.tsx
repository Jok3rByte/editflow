"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Tablas de la organización cuyos cambios deben reflejarse en vivo para todo
// el equipo. Todas tienen organization_id, así que la suscripción se filtra a
// la organización actual (cada quien solo recibe lo de su equipo, y RLS
// limita además a lo que ese rol puede ver).
const TABLAS = [
  "videos",
  "calendar_events",
  "clients",
  "client_periods",
  "memberships",
  "invitations",
  "periods",
] as const;

/**
 * Cuando cualquier miembro agrega o modifica datos de la organización,
 * Supabase Realtime avisa a los demás que tengan la app abierta y se dispara
 * router.refresh() (con un pequeño debounce) para traer el estado nuevo sin
 * tener que recargar a mano.
 */
export function RealtimeRefresher({ organizationId }: { organizationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refrescar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase.channel(`org-${organizationId}`);
    for (const table of TABLAS) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${organizationId}` },
        refrescar,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, router]);

  return null;
}
