import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import { EquipoClient } from "@/components/app/equipo/equipo-client";

export default async function EquipoPage() {
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: miembros }, { data: invitaciones }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, full_name, email, role, avatar_url")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("role")
      .order("full_name"),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at, token")
      .eq("organization_id", org.id)
      .eq("status", "pendiente")
      .order("created_at", { ascending: false }),
  ]);

  const puedeGestionar = org.role === "owner" || org.role === "admin";

  return (
    <EquipoClient
      organizationId={org.id}
      miembros={miembros ?? []}
      invitaciones={invitaciones ?? []}
      currentUserEmail={user?.email ?? null}
      puedeGestionar={puedeGestionar}
    />
  );
}
