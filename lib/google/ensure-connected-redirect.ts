import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * A dónde mandar a alguien justo después de crear su cuenta o aceptar una
 * invitación: si su membership más reciente todavía no tiene Google
 * conectado, el paso obligatorio de /crear-espacio/conectar-google antes
 * del dashboard — así cualquier cuenta nueva (owner o invitado) queda lista
 * para mandar/recibir invitaciones y notificaciones por correo desde el
 * primer momento, sin tener que ir a buscarlo a Configuración.
 */
export async function redirectTargetAfterAuth(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) return "/app/dashboard";

  const { data: conexion } = await supabase
    .from("google_oauth_tokens")
    .select("membership_id")
    .eq("membership_id", membership.id)
    .maybeSingle();

  return conexion ? "/app/dashboard" : "/crear-espacio/conectar-google";
}
