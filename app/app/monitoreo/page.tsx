import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization, resolveActivePeriod } from "@/lib/period/resolve";
import { MonitoreoClient } from "@/components/app/monitoreo/monitoreo-client";

export default async function MonitoreoPage() {
  const org = await requireActiveOrganization();
  const activePeriod = await resolveActivePeriod(org.id);
  const supabase = await createClient();

  const [{ data: videos }, { data: clientPeriods }, { data: miembros }] = await Promise.all([
    activePeriod
      ? supabase
          .from("videos")
          .select(
            "id, seq, title, client_id, editor_id, start_date, due_date, status, priority, progreso, progreso_inicio, clients(name)",
          )
          .eq("period_id", activePeriod.id)
          .order("seq", { ascending: true })
      : Promise.resolve({ data: [] }),
    activePeriod
      ? supabase
          .from("client_periods")
          .select("client_id, clients(id, name)")
          .eq("period_id", activePeriod.id)
          .eq("active", true)
      : Promise.resolve({ data: [] }),
    supabase
      .from("memberships")
      .select("id, full_name, email, role")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
  ]);

  const clientes = (clientPeriods ?? [])
    .map((cp) => cp.clients as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const videosNormalizados = (videos ?? []).map((v) => ({
    ...v,
    clients: v.clients as unknown as { name: string } | null,
  }));

  return (
    <MonitoreoClient
      periodId={activePeriod?.id ?? null}
      periodLabel={activePeriod?.label ?? null}
      videos={videosNormalizados}
      clientes={clientes}
      miembros={miembros ?? []}
      role={org.role}
    />
  );
}
