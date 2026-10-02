import { createServiceRoleClient } from "@/lib/supabase/server";
import { zonedDateParts } from "@/lib/utils/timezone";
import { appUrl } from "@/lib/supabase/env";
import { alreadyNotifiedToday } from "@/lib/notifications/dedupe";
import { sendMonthCloseReminderEmail } from "@/lib/email/send-month-close-reminder";

const DIGEST_HOUR = 8;
const DIAS_AVISO = 3; // avisa cuando quedan 2 días o menos para terminar el mes
const NOTIFICATION_TYPE = "month_close_reminder";

export interface MonthCloseReminderRunResult {
  organizacionesNotificadas: number;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Avisa a propietarios/administradores cuando el periodo del mes en curso
 * sigue abierto y faltan pocos días para que termine el mes calendario —
 * cerrar el periodo congela los números, así que conviene revisar antes.
 */
export async function sendMonthCloseReminders(): Promise<MonthCloseReminderRunResult> {
  const supabase = createServiceRoleClient();
  const result: MonthCloseReminderRunResult = { organizacionesNotificadas: 0 };

  const { data: organizations } = await supabase.from("organizations").select("id, name, timezone");

  for (const org of organizations ?? []) {
    const parts = zonedDateParts(new Date().toISOString(), org.timezone);
    if (parts.hour !== DIGEST_HOUR) continue;

    const diasRestantes = lastDayOfMonth(parts.year, parts.month) - parts.day;
    if (diasRestantes > DIAS_AVISO - 1) continue;

    const { data: periodo } = await supabase
      .from("periods")
      .select("id, label")
      .eq("organization_id", org.id)
      .eq("year", parts.year)
      .eq("month", parts.month)
      .eq("status", "abierto")
      .maybeSingle();

    if (!periodo) continue;
    if (await alreadyNotifiedToday(supabase, org.id, NOTIFICATION_TYPE, org.timezone)) continue;

    const { data: destinatarios } = await supabase
      .from("memberships")
      .select("email")
      .eq("organization_id", org.id)
      .eq("active", true)
      .in("role", ["owner", "admin"]);

    if (!destinatarios || destinatarios.length === 0) continue;

    const { data: kpisRow } = await supabase
      .from("v_period_kpis")
      .select("pendientes, en_edicion, atrasados")
      .eq("period_id", periodo.id)
      .maybeSingle();

    await Promise.all(
      destinatarios.map((destinatario) =>
        sendMonthCloseReminderEmail({
          to: destinatario.email,
          organizationName: org.name,
          periodLabel: periodo.label,
          diasRestantes: diasRestantes + 1,
          pendientes: kpisRow?.pendientes ?? 0,
          enEdicion: kpisRow?.en_edicion ?? 0,
          atrasados: kpisRow?.atrasados ?? 0,
          appUrl: appUrl(),
        }).catch((err) => {
          console.error(`No se pudo enviar el aviso de cierre de mes a ${destinatario.email}`, err);
        }),
      ),
    );

    await supabase.from("notifications").insert(
      destinatarios.map((destinatario) => ({
        organization_id: org.id,
        recipient_email: destinatario.email,
        type: NOTIFICATION_TYPE,
        title: `${periodo.label} cierra pronto`,
        email_sent_at: new Date().toISOString(),
      })),
    );

    result.organizacionesNotificadas += 1;
  }

  return result;
}
