import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listPeriods, requireActiveOrganization, resolveActivePeriod } from "@/lib/period/resolve";
import { currentYearMonthInTimezone } from "@/lib/utils/dates";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { PeriodSwitcher } from "@/components/period/period-switcher";
import { OpenCurrentMonthBanner } from "@/components/period/open-current-month-banner";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireActiveOrganization();
  const periods = await listPeriods(organization.id);
  const activePeriod = await resolveActivePeriod(organization.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const memberName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Usuario";

  const canManagePeriods = organization.role === "owner" || organization.role === "admin";

  const { year: currentYear, month: currentMonth } = currentYearMonthInTimezone(organization.timezone);
  const currentMonthOpen = periods.some((p) => p.year === currentYear && p.month === currentMonth);

  return (
    <SidebarProvider>
      <AppSidebar organization={organization} memberName={memberName} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <PeriodSwitcher
            periods={periods}
            activePeriodId={activePeriod?.id ?? null}
            canManage={canManagePeriods}
          />
          {activePeriod?.status === "cerrado" && (
            <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Mes cerrado — solo lectura
            </span>
          )}
        </header>

        {!currentMonthOpen && canManagePeriods && (
          <OpenCurrentMonthBanner organizationId={organization.id} year={currentYear} month={currentMonth} />
        )}

        {!activePeriod ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="text-lg font-medium">Aún no tienes ningún mes abierto</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Abre tu primer mes para empezar a registrar clientes y videos.
            </p>
            <Link
              href="/app/periodos/nuevo"
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Abrir mi primer mes
            </Link>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
