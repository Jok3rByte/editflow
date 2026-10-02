import { createServiceRoleClient } from "@/lib/supabase/server";
import { zonedDateParts } from "@/lib/utils/timezone";
import { appUrl } from "@/lib/supabase/env";
import { alreadyNotifiedToday } from "@/lib/notifications/dedupe";
import { sendWeeklyDigestEmail } from "@/lib/email/send-weekly-digest";
import type { DigestKpi } from "@/emails/daily-digest";
import type { DigestRankingRow } from "@/emails/weekly-digest";

const DIGEST_HOUR = 8;
const DIGEST_WEEKDAY = 1; // lunes
const NOTIFICATION_TYPE = "weekly_digest";

export interface WeeklyDigestRunResult {
  organizacionesNotificadas: number;
}

function weekdayInTimezone(timezone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    new Date(),
  );
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[formatted] ?? -1;
}

/**
 * Cada lunes a las 8am (hora local de cada organización), manda el avance
 * del mes en curso por cliente y por editor a los miembros con
 * notify_weekly_digest = true.
 */
export async function sendWeeklyDigests(): Promise<WeeklyDigestRunResult> {
  const supabase = createServiceRoleClient();
  const result: WeeklyDigestRunResult = { organizacionesNotificadas: 0 };

  const { data: organizations } = await supabase.from("organizations").select("id, name, timezone");

  for (const org of organizations ?? []) {
    if (weekdayInTimezone(org.timezone) !== DIGEST_WEEKDAY) continue;
    const parts = zonedDateParts(new Date().toISOString(), org.timezone);
    if (parts.hour !== DIGEST_HOUR) continue;
    if (await alreadyNotifiedToday(supabase, org.id, NOTIFICATION_TYPE, org.timezone)) continue;

    const { data: periodo } = await supabase
      .from("periods")
      .select("id, label")
      .eq("organization_id", org.id)
      .eq("status", "abierto")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: destinatarios } = await supabase
      .from("memberships")
      .select("email")
      .eq("organization_id", org.id)
      .eq("active", true)
      .eq("notify_weekly_digest", true);

    if (!periodo || !destinatarios || destinatarios.length === 0) continue;

    const { data: kpisRow } = await supabase
      .from("v_period_kpis")
      .select("*")
      .eq("period_id", periodo.id)
      .maybeSingle();

    const kpis: DigestKpi[] = kpisRow
      ? [
          { label: "Meta total", value: String(kpisRow.meta_total) },
          { label: "Entregados", value: String(kpisRow.entregados) },
          { label: "Atrasados", value: String(kpisRow.atrasados) },
          { label: "% Cumplimiento", value: `${kpisRow.cumplimiento_global ?? 0}%` },
        ]
      : [];

    const { data: clientesRaw } = await supabase
      .from("v_client_summary")
      .select("cliente, porcentaje_alcance_meta")
      .eq("period_id", periodo.id)
      .order("porcentaje_alcance_meta", { ascending: false })
      .limit(5);

    const clientesRanking: DigestRankingRow[] = (clientesRaw ?? []).map((c) => ({
      name: c.cliente,
      pct: c.porcentaje_alcance_meta,
    }));

    const { data: editoresRaw } = await supabase
      .from("v_editor_productivity")
      .select("editor, email, cumplimiento_pct")
      .eq("period_id", periodo.id)
      .order("cumplimiento_pct", { ascending: false })
      .limit(5);

    const editoresRanking: DigestRankingRow[] = (editoresRaw ?? []).map((e) => ({
      name: e.editor ?? e.email,
      pct: e.cumplimiento_pct,
    }));

    const dateLabel = new Intl.DateTimeFormat("es-CO", {
      timeZone: org.timezone,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    await Promise.all(
      destinatarios.map((destinatario) =>
        sendWeeklyDigestEmail({
          to: destinatario.email,
          organizationName: org.name,
          periodLabel: periodo.label,
          dateLabel,
          kpis,
          clientesRanking,
          editoresRanking,
          appUrl: appUrl(),
        }).catch((err) => {
          console.error(`No se pudo enviar el resumen semanal a ${destinatario.email}`, err);
        }),
      ),
    );

    await supabase.from("notifications").insert(
      destinatarios.map((destinatario) => ({
        organization_id: org.id,
        recipient_email: destinatario.email,
        type: NOTIFICATION_TYPE,
        title: `Resumen semanal — ${dateLabel}`,
        email_sent_at: new Date().toISOString(),
      })),
    );

    result.organizacionesNotificadas += 1;
  }

  return result;
}
