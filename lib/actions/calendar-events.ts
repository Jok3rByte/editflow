"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/lib/google/calendar";
import { GMAIL_SEND_SCOPE } from "@/lib/google/gmail";
import { sendEventNotificationEmail } from "@/lib/email/send-event-notification";
import { EVENT_TYPE_LABEL } from "@/lib/utils/event-type-label";
import type { EventType } from "@/types/database.types";

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  type: string;
  startAt: string; // ISO
  endAt: string; // ISO
  clientId?: string;
  videoId?: string;
  color?: string;
  assignedMembershipId?: string;
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
 * Crea el evento en EditFlow, lo replica en el Google Calendar conectado
 * (si hay uno) y avisa por correo: el propietario recibe todos los
 * eventos, y la persona asignada solo recibe el suyo. El correo sale
 * literalmente de la bandeja de envío de Gmail del propietario (el mismo
 * correo con el que se registró) si conectó ese scope; si no, cae a Resend.
 */
export async function createCalendarEvent(input: CreateCalendarEventInput) {
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const { data: event, error: insertError } = await supabase
    .from("calendar_events")
    .insert({
      organization_id: org.id,
      title: input.title,
      description: input.description,
      type: input.type as EventType,
      client_id: input.clientId,
      video_id: input.videoId,
      start_at: input.startAt,
      end_at: input.endAt,
      color: input.color,
    })
    .select("id")
    .single();

  if (insertError || !event) {
    throw new Error(insertError?.message ?? "No se pudo crear el evento.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miembros } = await supabase
    .from("memberships")
    .select("id, email, full_name, role, notify_calendar")
    .eq("organization_id", org.id)
    .eq("active", true);

  const propietario = miembros?.find((m) => m.role === "owner");
  const asignado = input.assignedMembershipId
    ? miembros?.find((m) => m.id === input.assignedMembershipId)
    : undefined;
  const creador = miembros?.find((m) => m.email === user?.email);

  // event_attendees: el propietario siempre (para ver "todos los eventos"),
  // más la persona asignada si es distinta.
  const asistentes = [propietario, asignado].filter(
    (m, i, arr): m is NonNullable<typeof m> => Boolean(m) && arr.findIndex((x) => x?.email === m?.email) === i,
  );

  if (asistentes.length > 0) {
    await supabase.from("event_attendees").insert(
      asistentes.map((m) => ({
        event_id: event.id,
        membership_id: m.id,
        email: m.email,
        notify: m.notify_calendar,
      })),
    );
  }

  // Recordatorio por correo 60 minutos antes del evento — lo procesa el
  // cron de /api/cron/reminders (ver lib/notifications/reminders.ts).
  await supabase.from("event_reminders").insert({ event_id: event.id, minutes_before: 60 });

  // Google Calendar: se crea una copia en el calendario PROPIO de cada
  // asistente que haya conectado su Google, con su propio token. Quien no lo
  // haya conectado simplemente no recibe la copia (pero sí el correo).
  const googleEvent = {
    title: input.title,
    description: input.description,
    startAt: input.startAt,
    endAt: input.endAt,
    timeZone: org.timezone,
  };
  const linkPorMiembro = new Map<string, string>();
  await Promise.all(
    asistentes.map(async (m) => {
      const r = await createGoogleCalendarEvent(m.id, googleEvent);
      if (r) {
        linkPorMiembro.set(m.id, r.htmlLink);
        await supabase
          .from("event_attendees")
          .update({ google_event_id: r.googleEventId, google_html_link: r.htmlLink })
          .eq("event_id", event.id)
          .eq("membership_id", m.id);
      }
    }),
  );

  // Correos de aviso: salen desde el Gmail del que crea el evento (owner o
  // admin) si conectó ese scope, con Resend como respaldo.
  if (creador) {
    const { data: creatorConn } = await supabase
      .from("google_oauth_tokens")
      .select("scope")
      .eq("membership_id", creador.id)
      .maybeSingle();
    const gmailSendAvailable = Boolean(creatorConn?.scope?.includes(GMAIL_SEND_SCOPE));

    const { dateLabel, timeLabel } = formatDateTimeEs(input.startAt, org.timezone);
    const eventTypeLabel = EVENT_TYPE_LABEL[input.type] ?? input.type;
    const senderName = creador.full_name ?? creador.email;

    await Promise.all(
      asistentes
        .filter((m) => m.notify_calendar)
        .map((m) =>
          sendEventNotificationEmail({
            to: m.email,
            senderMembershipId: creador.id,
            senderEmail: creador.email,
            gmailSendAvailable,
            ownerName: senderName,
            organizationName: org.name,
            eventTitle: input.title,
            eventTypeLabel,
            dateLabel,
            timeLabel,
            recipientIsOwner: m.role === "owner",
            assignedToName: asignado?.full_name ?? asignado?.email,
            googleCalendarLink: linkPorMiembro.get(m.id),
          }).catch((err) => {
            console.error(`No se pudo enviar el correo de notificación a ${m.email}`, err);
          }),
        ),
    );
  }

  revalidatePath("/app/calendario");
  return { id: event.id };
}

export type CalendarActionResult = { ok: true } | { ok: false; error: string };

export interface UpdateCalendarEventInput extends CreateCalendarEventInput {
  id: string;
}

/**
 * Actualiza el evento y, si ya tenía un espejo en Google Calendar, lo
 * actualiza también. No reenvía el correo de aviso (solo al crear) para no
 * saturar la bandeja del propietario con un correo por cada ajuste menor.
 */
export async function updateCalendarEvent(input: UpdateCalendarEventInput): Promise<CalendarActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para editar eventos." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("id", input.id)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "El evento no existe." };
  }

  // Espejos viejos en Google (uno por asistente, en su propio calendario):
  // se capturan antes de reemplazar los asistentes para poder borrarlos.
  const { data: espejosViejos } = await supabase
    .from("event_attendees")
    .select("membership_id, google_event_id")
    .eq("event_id", input.id);

  const { error: updateError } = await supabase
    .from("calendar_events")
    .update({
      title: input.title,
      description: input.description,
      type: input.type as EventType,
      client_id: input.clientId ?? null,
      video_id: input.videoId ?? null,
      start_at: input.startAt,
      end_at: input.endAt,
      color: input.color,
    })
    .eq("id", input.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { data: miembros } = await supabase
    .from("memberships")
    .select("id, email, full_name, role, notify_calendar")
    .eq("organization_id", org.id)
    .eq("active", true);

  const propietario = miembros?.find((m) => m.role === "owner");
  const asignado = input.assignedMembershipId
    ? miembros?.find((m) => m.id === input.assignedMembershipId)
    : undefined;
  const asistentes = [propietario, asignado].filter(
    (m, i, arr): m is NonNullable<typeof m> => Boolean(m) && arr.findIndex((x) => x?.email === m?.email) === i,
  );

  // Borra los espejos viejos del calendario de cada quien antes de recrearlos.
  await Promise.all(
    (espejosViejos ?? [])
      .filter((a): a is { membership_id: string; google_event_id: string } =>
        Boolean(a.membership_id && a.google_event_id),
      )
      .map((a) => deleteGoogleCalendarEvent(a.membership_id, a.google_event_id)),
  );

  // Reemplaza los asistentes en vez de diffear: cada evento solo tiene
  // propietario + un asignado como mucho, no vale la pena el diff.
  await supabase.from("event_attendees").delete().eq("event_id", input.id);
  if (asistentes.length > 0) {
    await supabase.from("event_attendees").insert(
      asistentes.map((m) => ({
        event_id: input.id,
        membership_id: m.id,
        email: m.email,
        notify: m.notify_calendar,
      })),
    );
  }

  // Reemplaza el recordatorio pendiente: si la hora del evento cambió, que
  // vuelva a avisar 60 minutos antes de la nueva hora en vez de quedarse
  // con el sent_at/horario viejo.
  await supabase.from("event_reminders").delete().eq("event_id", input.id);
  await supabase.from("event_reminders").insert({ event_id: input.id, minutes_before: 60 });

  // Recrea el espejo en el calendario propio de cada asistente conectado.
  const googleEvent = {
    title: input.title,
    description: input.description,
    startAt: input.startAt,
    endAt: input.endAt,
    timeZone: org.timezone,
  };
  await Promise.all(
    asistentes.map(async (m) => {
      const r = await createGoogleCalendarEvent(m.id, googleEvent);
      if (r) {
        await supabase
          .from("event_attendees")
          .update({ google_event_id: r.googleEventId, google_html_link: r.htmlLink })
          .eq("event_id", input.id)
          .eq("membership_id", m.id);
      }
    }),
  );

  revalidatePath("/app/calendario");
  return { ok: true };
}

export async function deleteCalendarEvent(eventId: string): Promise<CalendarActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para eliminar eventos." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "El evento no existe." };
  }

  // Espejos en los calendarios de los asistentes, para borrarlos de cada uno.
  const { data: espejos } = await supabase
    .from("event_attendees")
    .select("membership_id, google_event_id")
    .eq("event_id", eventId);

  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  if (error) {
    return { ok: false, error: error.message };
  }

  await Promise.all(
    (espejos ?? [])
      .filter((a): a is { membership_id: string; google_event_id: string } =>
        Boolean(a.membership_id && a.google_event_id),
      )
      .map((a) => deleteGoogleCalendarEvent(a.membership_id, a.google_event_id)),
  );

  revalidatePath("/app/calendario");
  return { ok: true };
}
