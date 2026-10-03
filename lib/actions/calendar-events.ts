"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import {
  createGoogleCalendarEvent,
  createGoogleMeetingEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google/calendar";
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
  /** Correos invitados a la reunión (equipo o externos). Si hay alguno, el
   *  evento se trata como reunión: un solo evento en el calendario del
   *  creador, con todos como invitados, y Google les manda la invitación. */
  guestEmails?: string[];
  /** Si true, se agrega un enlace de Google Meet al evento. */
  withMeet?: boolean;
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

interface Miembro {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  notify_calendar: boolean;
}

function dedupAsistentes(lista: (Miembro | undefined)[]): Miembro[] {
  return lista.filter(
    (m, i, arr): m is Miembro => Boolean(m) && arr.findIndex((x) => x?.email === m?.email) === i,
  );
}

function normalizarInvitados(guestEmails?: string[]): string[] {
  return Array.from(
    new Set((guestEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)),
  );
}

/**
 * Crea el evento en EditFlow y lo sincroniza con Google de una de dos formas:
 *
 * - REUNIÓN (tiene invitados y/o Meet): un solo evento en el calendario del
 *   creador con todos los correos como invitados y, si se pidió, un enlace de
 *   Google Meet. Google le manda la invitación a cada correo (sirve para
 *   gente externa; no necesitan conectar nada).
 * - EVENTO NORMAL (sin invitados): se escribe una copia en el calendario
 *   propio de cada miembro asistente conectado, y se avisa por correo.
 */
export async function createCalendarEvent(input: CreateCalendarEventInput) {
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: miembros } = await supabase
    .from("memberships")
    .select("id, email, full_name, role, notify_calendar")
    .eq("organization_id", org.id)
    .eq("active", true);

  const propietario = (miembros as Miembro[] | null)?.find((m) => m.role === "owner");
  const asignado = input.assignedMembershipId
    ? (miembros as Miembro[] | null)?.find((m) => m.id === input.assignedMembershipId)
    : undefined;
  const creador = (miembros as Miembro[] | null)?.find((m) => m.email === user?.email);

  const invitados = normalizarInvitados(input.guestEmails);
  const esReunion = invitados.length > 0 || Boolean(input.withMeet);

  // Recordatorio por correo 60 minutos antes — lo procesa el cron de reminders.
  await supabase.from("event_reminders").insert({ event_id: event.id, minutes_before: 60 });

  // Notificación en vivo para la persona asignada (si no es quien crea el
  // evento): queda registrada en notifications y el listener del front la
  // muestra como toast en tiempo real. Se inserta con service role porque la
  // fila es para OTRO usuario (RLS no deja insertar notificaciones ajenas).
  if (asignado && asignado.id !== creador?.id) {
    const { dateLabel, timeLabel } = formatDateTimeEs(input.startAt, org.timezone);
    const tipoLabel = EVENT_TYPE_LABEL[input.type] ?? input.type;
    const admin = createServiceRoleClient();
    const { error: notifError } = await admin.from("notifications").insert({
      organization_id: org.id,
      recipient_email: asignado.email,
      membership_id: asignado.id,
      type: "calendar_event",
      title: `Nuevo evento: ${input.title}`,
      body: `${tipoLabel} · ${dateLabel} a las ${timeLabel}`,
      link: "/app/calendario",
    });
    if (notifError) console.error("No se pudo crear la notificación del evento", notifError.message);
  }

  if (esReunion) {
    const asistentesEquipo = dedupAsistentes([propietario, asignado]);
    // Guarda asistentes del equipo (con membership) y los invitados externos
    // (sin membership) para poder mostrarlos y editarlos después.
    const emailsEquipo = new Set(asistentesEquipo.map((m) => m.email.toLowerCase()));
    const filas = [
      ...asistentesEquipo.map((m) => ({ event_id: event.id, membership_id: m.id, email: m.email, notify: false })),
      ...invitados
        .filter((e) => !emailsEquipo.has(e))
        .map((e) => ({ event_id: event.id, email: e, notify: false })),
    ];
    if (filas.length > 0) {
      await supabase.from("event_attendees").insert(filas);
    }

    if (creador) {
      const invitacion = Array.from(
        new Set([...asistentesEquipo.map((m) => m.email.toLowerCase()), ...invitados]),
      ).filter((e) => e !== creador.email.toLowerCase());

      const meeting = await createGoogleMeetingEvent(creador.id, {
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        timeZone: org.timezone,
        attendeeEmails: invitacion,
        withMeet: Boolean(input.withMeet),
      });

      if (meeting) {
        await supabase
          .from("calendar_events")
          .update({
            google_event_id: meeting.googleEventId,
            google_html_link: meeting.htmlLink,
            meeting_url: meeting.meetLink,
            google_organizer_membership_id: creador.id,
          })
          .eq("id", event.id);
      }
    }

    revalidatePath("/app/calendario");
    return { id: event.id };
  }

  // ----- Evento normal: espejo por-miembro + correos de aviso -----
  const asistentes = dedupAsistentes([propietario, asignado]);

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
 * Actualiza el evento. Borra los espejos/reunión viejos de Google y los
 * recrea según el nuevo estado (reunión o evento normal). No reenvía el
 * correo de aviso de los eventos normales (solo al crear).
 */
export async function updateCalendarEvent(input: UpdateCalendarEventInput): Promise<CalendarActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para editar eventos." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id, google_event_id, google_organizer_membership_id")
    .eq("id", input.id)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "El evento no existe." };
  }

  // Espejos por-miembro viejos (uno por asistente en su propio calendario).
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
      // se recalculan abajo según el nuevo estado
      google_event_id: null,
      google_html_link: null,
      meeting_url: null,
      google_organizer_membership_id: null,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const propietario = (miembros as Miembro[] | null)?.find((m) => m.role === "owner");
  const asignado = input.assignedMembershipId
    ? (miembros as Miembro[] | null)?.find((m) => m.id === input.assignedMembershipId)
    : undefined;
  const creador = (miembros as Miembro[] | null)?.find((m) => m.email === user?.email);

  // Borra la reunión vieja de Google (si la había) notificando la cancelación.
  if (existing.google_event_id && existing.google_organizer_membership_id) {
    await deleteGoogleCalendarEvent(
      existing.google_organizer_membership_id,
      existing.google_event_id,
      true,
    );
  }
  // Borra los espejos por-miembro viejos del calendario de cada quien.
  await Promise.all(
    (espejosViejos ?? [])
      .filter((a): a is { membership_id: string; google_event_id: string } =>
        Boolean(a.membership_id && a.google_event_id),
      )
      .map((a) => deleteGoogleCalendarEvent(a.membership_id, a.google_event_id)),
  );

  const invitados = normalizarInvitados(input.guestEmails);
  const esReunion = invitados.length > 0 || Boolean(input.withMeet);
  const asistentesEquipo = dedupAsistentes([propietario, asignado]);

  // Reemplaza los asistentes.
  await supabase.from("event_attendees").delete().eq("event_id", input.id);

  // Reemplaza el recordatorio pendiente a la nueva hora.
  await supabase.from("event_reminders").delete().eq("event_id", input.id);
  await supabase.from("event_reminders").insert({ event_id: input.id, minutes_before: 60 });

  if (esReunion) {
    const emailsEquipo = new Set(asistentesEquipo.map((m) => m.email.toLowerCase()));
    const filas = [
      ...asistentesEquipo.map((m) => ({ event_id: input.id, membership_id: m.id, email: m.email, notify: false })),
      ...invitados
        .filter((e) => !emailsEquipo.has(e))
        .map((e) => ({ event_id: input.id, email: e, notify: false })),
    ];
    if (filas.length > 0) {
      await supabase.from("event_attendees").insert(filas);
    }

    if (creador) {
      const invitacion = Array.from(
        new Set([...asistentesEquipo.map((m) => m.email.toLowerCase()), ...invitados]),
      ).filter((e) => e !== creador.email.toLowerCase());

      const meeting = await createGoogleMeetingEvent(creador.id, {
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        timeZone: org.timezone,
        attendeeEmails: invitacion,
        withMeet: Boolean(input.withMeet),
      });

      if (meeting) {
        await supabase
          .from("calendar_events")
          .update({
            google_event_id: meeting.googleEventId,
            google_html_link: meeting.htmlLink,
            meeting_url: meeting.meetLink,
            google_organizer_membership_id: creador.id,
          })
          .eq("id", input.id);
      }
    }

    revalidatePath("/app/calendario");
    return { ok: true };
  }

  // ----- Evento normal: espejo por-miembro -----
  if (asistentesEquipo.length > 0) {
    await supabase.from("event_attendees").insert(
      asistentesEquipo.map((m) => ({
        event_id: input.id,
        membership_id: m.id,
        email: m.email,
        notify: m.notify_calendar,
      })),
    );
  }

  const googleEvent = {
    title: input.title,
    description: input.description,
    startAt: input.startAt,
    endAt: input.endAt,
    timeZone: org.timezone,
  };
  await Promise.all(
    asistentesEquipo.map(async (m) => {
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
    .select("id, google_event_id, google_organizer_membership_id")
    .eq("id", eventId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "El evento no existe." };
  }

  // Espejos por-miembro, para borrarlos del calendario de cada uno.
  const { data: espejos } = await supabase
    .from("event_attendees")
    .select("membership_id, google_event_id")
    .eq("event_id", eventId);

  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  if (error) {
    return { ok: false, error: error.message };
  }

  // Reunión (un evento en el calendario del organizador): avisar cancelación.
  if (existing.google_event_id && existing.google_organizer_membership_id) {
    await deleteGoogleCalendarEvent(
      existing.google_organizer_membership_id,
      existing.google_event_id,
      true,
    );
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
