import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import { MetricasClient } from "@/components/app/metricas/metricas-client";

export default async function MetricasPage() {
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const [{ data: clientSeries }, { data: editorSeries }, { data: clientes }, { data: miembros }] = await Promise.all([
    supabase
      .from("v_client_month_series")
      .select("*")
      .eq("organization_id", org.id)
      .order("year", { ascending: true })
      .order("month", { ascending: true }),
    supabase
      .from("v_editor_month_series")
      .select("*")
      .eq("organization_id", org.id)
      .order("year", { ascending: true })
      .order("month", { ascending: true }),
    supabase.from("clients").select("id, name").eq("organization_id", org.id).order("name"),
    supabase
      .from("memberships")
      .select("id, full_name, email, role")
      .eq("organization_id", org.id)
      .eq("active", true)
      .order("full_name"),
  ]);

  return (
    <MetricasClient
      clientSeries={clientSeries ?? []}
      editorSeries={editorSeries ?? []}
      clientes={clientes ?? []}
      miembros={miembros ?? []}
    />
  );
}
