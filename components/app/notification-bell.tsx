"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { playBellSound, playAlertSound, playSuccessSound } from "@/lib/preview/notification-sounds";

export interface NotificacionRow {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  type?: string | null;
}

// Cada tipo de notificación suena distinto en la campanita: alerta para los
// estancamientos, check para los 100%, campana para todo lo demás.
function sonarPorTipo(type?: string | null) {
  if (type === "video_estancado") playAlertSound();
  else if (type === "video_completado") playSuccessSound();
  else playBellSound();
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function NotificationBell({
  membershipId,
  initial,
}: {
  membershipId: string;
  initial: NotificacionRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificacionRow[]>(initial);
  const [open, setOpen] = useState(false);

  const sinLeer = items.filter((n) => !n.read_at).length;

  // Suscripción en vivo: una notificación nueva suena la campana, se pone en
  // rojo con el contador y se agrega a la lista.
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

        const channel = supabase.channel(`bell-${membershipId}`);
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `membership_id=eq.${membershipId}` },
          (payload) => {
            const n = payload.new as NotificacionRow;
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 30));
            sonarPorTipo(n.type);
            toast(n.title, { description: n.body ?? undefined });
          },
        );
        channel.subscribe();
        cleanup = () => {
          try {
            supabase.removeChannel(channel);
          } catch {
            // sin importancia
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
  }, [membershipId]);

  async function marcarTodasLeidas() {
    if (sinLeer === 0) return;
    const ahora = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: ahora })));
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ read_at: ahora }).eq("membership_id", membershipId).is("read_at", null);
    } catch {
      // si falla, en el próximo refresh se recalcula
    }
  }

  function abrir(o: boolean) {
    setOpen(o);
    if (o) void marcarTodasLeidas();
  }

  function irA(n: NotificacionRow) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <Popover open={open} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          title="Notificaciones"
          aria-label={`Notificaciones${sinLeer > 0 ? ` (${sinLeer} sin leer)` : ""}`}
        >
          <Bell className="size-4" />
          {sinLeer > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-danger-foreground">
              {sinLeer > 9 ? "9+" : sinLeer}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => irA(n)}
                className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/40"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{n.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{tiempoRelativo(n.created_at)}</span>
                </span>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
