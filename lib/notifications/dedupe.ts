import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { zonedDateParts } from "@/lib/utils/timezone";

/**
 * Los crons de resumen (diario/semanal/cierre de mes) pueden correr más de
 * una vez dentro de la misma hora objetivo (el servicio externo que los
 * dispara no es tan preciso como un cron nativo) — esto evita reenviar
 * comparando contra la última notificación de ese tipo ya registrada,
 * calculando "hoy" en la zona horaria de la organización, no en UTC.
 */
export async function alreadyNotifiedToday(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  type: string,
  timezone: string,
): Promise<boolean> {
  const { data: last } = await supabase
    .from("notifications")
    .select("created_at")
    .eq("organization_id", organizationId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) return false;

  const today = zonedDateParts(new Date().toISOString(), timezone);
  const lastSent = zonedDateParts(last.created_at, timezone);
  return today.year === lastSent.year && today.month === lastSent.month && today.day === lastSent.day;
}
