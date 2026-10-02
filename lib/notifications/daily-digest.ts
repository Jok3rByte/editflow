import { createServiceRoleClient } from "@/lib/supabase/server";
import { zonedDateParts, zonedTimeToUtcIso } from "@/lib/utils/timezone";
import { formatDateEs } from "@/lib/utils/dates";
import { appUrl } from "@/lib/supabase/env";
import { alreadyNotifiedToday } from "@/lib/notifications/dedupe";
import { sendDailyDigestEmail } from "@/lib/email/send-daily-digest";
import type { DigestEventRow, DigestKpi, DigestVideoRow } from "@/emails/daily-digest";

const DIGEST_HOUR = 8;
const NOTIFICATION_TYPE = "daily_digest";

export interface DailyDigestRunResult {
  organizacionesNotificadas: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Para cada organización, si ya son las 8am en su zona horaria y todavía no
 * se mandó el resumen diario hoy, junta los KPIs del periodo abierto, los
 * eventos de hoy y los videos atrasados, y lo manda a los miembros activos
 * con notify_daily_digest = true.
 */
export async function sendDailyDigests(): Promise<DailyDigestRunResult> {
  const supabase = createServiceRoleClient();
  const result: DailyDigestRunResult = { organizacionesNotificadas: 0 };

  const { data: organizations } = await supabase.from("organizations").select("id, name, timezone");

  for (const org of organizations ?? []) {
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
      .eq("notify_daily_digest", true);

    if (!periodo || !destinatarios || destinatarios.length === 0) continue;

    const { data: kpisRow } = await supabase
      .from("v_period_kpis")
      .select("*")
      .eq("period_id", periodo.id)
      .maybeSingle();

    const kpis: DigestKpi[] = kpisRow
      ? [
          { label: "Clientes activos", value: String(kpisRow.clientes_activos) },
          { label: "Entregados", value: String(kpisRow.entregados) },
          { label: "En edición", value: String(kpisRow.en_edicion) },
          { label: "Atrasados", value: String(kpisRow.atrasados) },
          { label: "% Cumplimiento", value: `${kpisRow.cumplimiento_global ?? 0}%` },
        ]
      : [];

    const todayStartIso = zonedTimeToUtcIso(parts.year, parts.month, parts.day, 0, 0, org.timezone);
    const todayEndIso = zonedTimeToUtcIso(parts.year, parts.month, parts.day, 23, 59, org.timezone);

    const { data: eventosHoyRaw } = await supabase
      .from("v_calendar_events_full")
      .select("title, start_at")
      .eq("organization_id", org.id)
      .gte("start_at", todayStartIso)
      .lte("start_at", todayEndIso)
      .order("start_at", { ascending: true });

    const eventosHoy: DigestEventRow[] = (eventosHoyRaw ?? []).map((event) => ({
      title: event.title,
      timeLabel: new Intl.DateTimeFormat("es-CO", {
        timeZone: org.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(event.start_at)),
    }));

    const todayDateStr = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    const { data: videosAtrasadosRaw } = await supabase
      .from("videos")
      .select("title, due_date, clients(name)")
      .eq("period_id", periodo.id)
      .lt("due_date", todayDateStr)
      .not("status", "in", "(aprobado,entregado,cancelado)")
      .order("due_date", { ascending: true })
      .limit(5);

    const videosAtrasados: DigestVideoRow[] = (videosAtrasadosRaw ?? []).map((video) => ({
      title: video.title,
      clientName: (video.clients as unknown as { name: string } | null)?.name ?? "Sin cliente",
      dueDateLabel: formatDateEs(video.due_date),
    }));

    const dateLabel = new Intl.DateTimeFormat("es-CO", {
      timeZone: org.timezone,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    await Promise.all(
      destinatarios.map((destinatario) =>
        sendDailyDigestEmail({
          to: destinatario.email,
          organizationName: org.name,
          periodLabel: periodo.label,
          dateLabel,
          kpis,
          eventosHoy,
          videosAtrasados,
          appUrl: appUrl(),
        }).catch((err) => {
          console.error(`No se pudo enviar el resumen diario a ${destinatario.email}`, err);
        }),
      ),
    );

    await supabase.from("notifications").insert(
      destinatarios.map((destinatario) => ({
        organization_id: org.id,
        recipient_email: destinatario.email,
        type: NOTIFICATION_TYPE,
        title: `Resumen diario — ${dateLabel}`,
        email_sent_at: new Date().toISOString(),
      })),
    );

    result.organizacionesNotificadas += 1;
  }

  return result;
}
