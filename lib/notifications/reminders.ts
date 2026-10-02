import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEventReminderEmail } from "@/lib/email/send-event-reminder";
import { EVENT_TYPE_LABEL } from "@/lib/utils/event-type-label";

export interface RemindersRunResult {
  sent: number;
  skipped: number;
}

function formatDateTimeEs(iso: string, timezone: string) {
  const date = new Date(iso);
  const dateLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: timezone,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return { dateLabel, timeLabel };
}

/**
 * Revisa event_reminders pendientes (sent_at null). Si ya pasó la hora de
 * avisar (start_at - minutes_before) pero el evento todavía no empezó,
 * manda el correo a los asistentes con notify=true y marca sent_at. Si el
 * evento ya empezó sin que se haya alcanzado a avisar (el cron estuvo
 * caído, por ejemplo), lo marca como procesado sin mandar nada para que no
 * quede reintentando para siempre.
 */
export async function sendDueEventReminders(): Promise<RemindersRunResult> {
  const supabase = createServiceRoleClient();
  const result: RemindersRunResult = { sent: 0, skipped: 0 };
  const now = new Date();

  const { data: reminders } = await supabase
    .from("event_reminders")
    .select(
      "id, event_id, minutes_before, calendar_events(id, title, type, start_at, location, meeting_url, organizations(name, timezone))",
    )
    .is("sent_at", null);

  for (const reminder of reminders ?? []) {
    const event = reminder.calendar_events as unknown as {
      id: string;
      title: string;
      type: string;
      start_at: string;
      location: string | null;
      meeting_url: string | null;
      organizations: { name: string; timezone: string } | null;
    } | null;

    if (!event || !event.organizations) {
      result.skipped += 1;
      continue;
    }

    const startAt = new Date(event.start_at);
    if (now >= startAt) {
      // Ya empezó (o se nos pasó la hora de avisar por mucho): se descarta.
      await supabase.from("event_reminders").update({ sent_at: now.toISOString() }).eq("id", reminder.id);
      result.skipped += 1;
      continue;
    }

    const dueAt = new Date(startAt.getTime() - reminder.minutes_before * 60_000);
    if (now < dueAt) {
      // Todavía no es la hora de avisar.
      continue;
    }

    const { data: attendees } = await supabase
      .from("event_attendees")
      .select("email")
      .eq("event_id", event.id)
      .eq("notify", true);

    const { dateLabel, timeLabel } = formatDateTimeEs(event.start_at, event.organizations.timezone);

    await Promise.all(
      (attendees ?? []).map((attendee) =>
        sendEventReminderEmail({
          to: attendee.email,
          eventTitle: event.title,
          eventTypeLabel: EVENT_TYPE_LABEL[event.type] ?? event.type,
          dateLabel,
          timeLabel,
          minutesBefore: reminder.minutes_before,
          organizationName: event.organizations!.name,
          location: event.location ?? undefined,
          meetingUrl: event.meeting_url ?? undefined,
        }).catch((err) => {
          console.error(`No se pudo enviar el recordatorio a ${attendee.email}`, err);
        }),
      ),
    );

    await supabase.from("event_reminders").update({ sent_at: now.toISOString() }).eq("id", reminder.id);
    result.sent += 1;
  }

  return result;
}
