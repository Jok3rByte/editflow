import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export const ACTIVE_PERIOD_COOKIE = "editflow_periodo";

export interface ActiveOrganization {
  id: string;
  name: string;
  role: Database["public"]["Enums"]["member_role"];
  timezone: string;
  ownerEmail: string;
}

export interface ActivePeriod {
  id: string;
  label: string;
  year: number;
  month: number;
  status: Database["public"]["Enums"]["period_status"];
}

/**
 * MVP: toma la primera organización activa del usuario. El selector de
 * espacios (para usuarios con varias organizaciones) vive en /crear-espacio/espacio;
 * una vez dentro de /app se opera sobre una sola a la vez.
 */
export async function requireActiveOrganization(): Promise<ActiveOrganization> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crear-espacio");
  }

  // Filtrar por user_id es CRÍTICO: RLS deja ver todas las membresías de la
  // organización, así que sin esto .limit(1) podía devolver la membresía de
  // otro miembro (ej. la del owner) y un editor quedaba tratado como owner en
  // la UI/acciones, aunque RLS (que usa auth.uid()) después bloqueara la
  // escritura.
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, timezone, owner_email)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const org = data?.organizations as unknown as
    | { id: string; name: string; timezone: string; owner_email: string }
    | null
    | undefined;

  if (!data || !org) {
    redirect("/crear-espacio/espacio");
  }

  return { id: org.id, name: org.name, role: data.role, timezone: org.timezone, ownerEmail: org.owner_email };
}

export async function listPeriods(organizationId: string): Promise<ActivePeriod[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("periods")
    .select("id, label, year, month, status")
    .eq("organization_id", organizationId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  return data ?? [];
}

export async function resolveActivePeriod(
  organizationId: string,
  requestedPeriodId?: string,
): Promise<ActivePeriod | null> {
  const periods = await listPeriods(organizationId);
  if (periods.length === 0) return null;

  if (requestedPeriodId) {
    const match = periods.find((p) => p.id === requestedPeriodId);
    if (match) return match;
  }

  const cookieStore = await cookies();
  const cookiePeriodId = cookieStore.get(ACTIVE_PERIOD_COOKIE)?.value;
  if (cookiePeriodId) {
    const match = periods.find((p) => p.id === cookiePeriodId);
    if (match) return match;
  }

  return periods.find((p) => p.status === "abierto") ?? periods[0];
}
