import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import { listOrganizationClients } from "@/lib/actions/clients";
import { OpenPeriodWizard } from "@/components/period/open-period-wizard";

export default async function NuevoPeriodoPage() {
  const organization = await requireActiveOrganization();
  if (organization.role !== "owner" && organization.role !== "admin") {
    redirect("/app/dashboard");
  }

  const supabase = await createClient();

  const { data: latestPeriod } = await supabase
    .from("periods")
    .select("id, year, month, label")
    .eq("organization_id", organization.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: continuingClientPeriods }, allClients, { data: pendingVideos }] =
    await Promise.all([
      latestPeriod
        ? supabase
            .from("client_periods")
            .select("client_id, monthly_goal, active, clients(name)")
            .eq("period_id", latestPeriod.id)
        : Promise.resolve({ data: null }),
      listOrganizationClients(organization.id),
      latestPeriod
        ? supabase
            .from("videos")
            .select("id, title, due_date, clients(name)")
            .eq("period_id", latestPeriod.id)
            .not("status", "in", "(aprobado,entregado,cancelado)")
            .order("due_date")
        : Promise.resolve({ data: null }),
    ]);

  const continuing = (continuingClientPeriods ?? [])
    .filter((cp) => cp.active)
    .map((cp) => ({
      clientId: cp.client_id,
      name: (cp.clients as unknown as { name: string } | null)?.name ?? "",
      monthlyGoal: cp.monthly_goal,
    }));

  const otherClients = allClients.filter(
    (c) => !continuing.some((cp) => cp.clientId === c.id),
  );

  const pending = (pendingVideos ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    dueDate: v.due_date,
    clientName: (v.clients as unknown as { name: string } | null)?.name ?? "",
  }));

  let defaultYear: number;
  let defaultMonth: number;
  if (latestPeriod) {
    defaultMonth = latestPeriod.month === 12 ? 1 : latestPeriod.month + 1;
    defaultYear = latestPeriod.month === 12 ? latestPeriod.year + 1 : latestPeriod.year;
  } else {
    const now = new Date();
    defaultYear = now.getUTCFullYear();
    defaultMonth = now.getUTCMonth() + 1;
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <h1 className="text-xl font-semibold tracking-tight">Abrir nuevo mes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {latestPeriod
          ? `Tu último mes fue ${latestPeriod.label}. Este asistente arranca uno nuevo en cero.`
          : "Este será tu primer mes de trabajo en EditFlow."}
      </p>

      <div className="mt-6">
        <OpenPeriodWizard
          organizationId={organization.id}
          defaultYear={defaultYear}
          defaultMonth={defaultMonth}
          continuingClients={continuing}
          otherClients={otherClients.map((c) => ({
            clientId: c.id,
            name: c.name,
            monthlyGoal: c.default_monthly_goal,
          }))}
          pendingVideos={pending}
        />
      </div>
    </div>
  );
}
