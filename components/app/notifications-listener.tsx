"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Escucha las notificaciones del usuario (ej. un evento que le asignaron) y,
 * cuando llega una nueva, la muestra como toast en tiempo real. La fila vive
 * en la tabla notifications; acá solo reaccionamos a los INSERT propios
 * (filtrado por membership_id; RLS además solo entrega los suyos).
 */
export function NotificationsListener({ membershipId }: { membershipId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cleanup = () => {};
    let cancelado = false;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
        if (cancelado) return;

        const channel = supabase.channel(`notif-${membershipId}`);
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `membership_id=eq.${membershipId}` },
          (payload) => {
            const n = payload.new as { title?: string; body?: string };
            toast(n.title ?? "Nueva notificación", { description: n.body ?? undefined });
            router.refresh();
          },
        );
        channel.subscribe();

        cleanup = () => {
          try {
            supabase.removeChannel(channel);
          } catch {
            // sin importancia al desmontar
          }
        };
      } catch (err) {
        console.error("Notificaciones en vivo no disponibles:", err);
      }
    })();

    return () => {
      cancelado = true;
      cleanup();
    };
  }, [membershipId, router]);

  return null;
}
