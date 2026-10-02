import { createServiceRoleClient } from "@/lib/supabase/server";
import { listCalendarEvents, type GoogleRawEvent } from "@/lib/google/calendar";
import type { EventType } from "@/types/database.types";

// Palabra clave: solo un evento de Google Calendar que la tenga (en el
// título o la descripción) se importa a EditFlow — así un evento personal
// del propietario (una cita médica, un cumpleaños...) no contamina el
// calendario del equipo. Ejemplo real: "Hey Siri, agrega un evento Flow:
// reunión de grabación para Autonorte el 10 de noviembre a las 3pm".
const FLOW_KEYWORD = /\bflow\b/i;

function containsFlowKeyword(event: GoogleRawEvent): boolean {
  return FLOW_KEYWORD.test(event.summary ?? "") || FLOW_KEYWORD.test(event.description ?? "");
}

function stripFlowKeyword(text: string): string {
  return text
    .replace(/\bflow\b\s*[:\-–]?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function inferEventType(text: string): EventType {
  const t = text.toLowerCase();
  if (/grabaci[oó]n/.test(t)) return "grabacion";
  if (/entrega/.test(t)) return "entrega";
  if (/reuni[oó]n/.test(t)) return "reunion";
  if (/clase/.test(t)) return "clase";
  return "evento";
}

function eventDateTime(part: { dateTime?: string; date?: string } | undefined): { iso: string; allDay: boolean } | null {
  if (!part) return null;
  if (part.dateTime) return { iso: part.dateTime, allDay: false };
  if (part.date) return { iso: `${part.date}T00:00:00`, allDay: true };
  return null;
}

export interface SyncResult {
  membershipId: string;
  organizationId: string;
  imported: number;
  removed: number;
  skipped: number;
  error?: string;
}

/**
 * Trae los cambios del Google Calendar PROPIO de un miembro y refleja en
 * calendar_events solo los que tienen la palabra clave "Flow". Se llama
 * desde el cron (todas las conexiones) — nunca desde una request de usuario,
 * por eso usa el service role client directo.
 */
export async function syncMembershipCalendar(membershipId: string): Promise<SyncResult> {
  const supabase = createServiceRoleClient();
  const result: SyncResult = { membershipId, organizationId: "", imported: 0, removed: 0, skipped: 0 };

  const { data: tokenRow } = await supabase
    .from("google_oauth_tokens")
    .select("organization_id, calendar_sync_token")
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (!tokenRow) {
    result.error = "Sin conexión de Google Calendar para este miembro.";
    return result;
  }

  const organizationId = tokenRow.organization_id;
  result.organizationId = organizationId;

  const { data: org } = await supabase
    .from("organizations")
    .select("timezone")
    .eq("id", organizationId)
    .single();

  if (!org) {
    result.error = "Sin organización.";
    return result;
  }

  let listResult = await listCalendarEvents(membershipId, {
    syncToken: tokenRow.calendar_sync_token,
    timeMinIso: new Date().toISOString(),
  });

  if (listResult?.needsFullResync) {
    listResult = await listCalendarEvents(membershipId, {
      syncToken: null,
      timeMinIso: new Date().toISOString(),
    });
  }

  if (!listResult) {
    result.error = "No se pudo listar el calendario de Google.";
    return result;
  }

  const { data: miembros } = await supabase
    .from("memberships")
    .select("id, email")
    .eq("organization_id", organizationId);
  const membershipIdByEmail = new Map((miembros ?? []).map((m) => [m.email.toLowerCase(), m.id]));

  for (const event of listResult.events) {
    if (event.status === "cancelled") {
      const { data: eliminado } = await supabase
        .from("calendar_events")
        .delete()
        .eq("organization_id", organizationId)
        .eq("google_event_id", event.id)
        .select("id");
      if (eliminado && eliminado.length > 0) result.removed += 1;
      continue;
    }

    if (!containsFlowKeyword(event)) {
      result.skipped += 1;
      continue;
    }

    const start = eventDateTime(event.start);
    const end = eventDateTime(event.end);
    if (!start || !end) {
      result.skipped += 1;
      continue;
    }

    const rawTitle = event.summary ?? "Evento sin título";
    const title = stripFlowKeyword(rawTitle) || rawTitle;
    const description = event.description ? stripFlowKeyword(event.description) : null;

    const { data: upserted, error } = await supabase
      .from("calendar_events")
      .upsert(
        {
          organization_id: organizationId,
          title,
          description,
          type: inferEventType(`${rawTitle} ${event.description ?? ""}`),
          start_at: start.iso,
          end_at: end.iso,
          all_day: start.allDay,
          google_event_id: event.id,
          google_html_link: event.htmlLink,
        },
        { onConflict: "google_event_id" },
      )
      .select("id")
      .single();

    if (error || !upserted) {
      result.skipped += 1;
      continue;
    }

    result.imported += 1;

    const asistentes = (event.attendees ?? [])
      .map((a) => ({ email: a.email.toLowerCase(), membershipId: membershipIdByEmail.get(a.email.toLowerCase()) }))
      .filter((a) => a.membershipId);

    if (asistentes.length > 0) {
      await supabase.from("event_attendees").upsert(
        asistentes.map((a) => ({
          event_id: upserted.id,
          membership_id: a.membershipId,
          email: a.email,
          notify: false, // ya vino de Google, no hace falta re-notificar
        })),
        { onConflict: "event_id,email" },
      );
    }
  }

  await supabase
    .from("google_oauth_tokens")
    .update({ calendar_sync_token: listResult.nextSyncToken })
    .eq("membership_id", membershipId);

  return result;
}

export async function syncAllConnections(): Promise<SyncResult[]> {
  const supabase = createServiceRoleClient();
  const { data: conexiones } = await supabase.from("google_oauth_tokens").select("membership_id");

  const resultados: SyncResult[] = [];
  for (const conexion of conexiones ?? []) {
    resultados.push(await syncMembershipCalendar(conexion.membership_id));
  }
  return resultados;
}
