import { createServiceRoleClient } from "@/lib/supabase/server";
import { googleClientId, googleClientSecret } from "@/lib/supabase/env";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Cambia un refresh_token de Google por un access_token nuevo. Se llama
 * directo contra Google (no pasa por Supabase Auth) porque el token
 * original se obtuvo en el login/conexión y necesitamos poder renovarlo
 * después, sin que el usuario esté presente (ej. desde un server action).
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`No se pudo renovar el token de Google (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

/**
 * Devuelve un access_token válido para la organización, renovándolo si ya
 * expiró. Devuelve null si la organización no tiene Google Calendar
 * conectado — quien llama decide si eso bloquea la acción o solo se salta
 * el paso de Google (los correos por Resend siguen funcionando igual).
 */
export async function getValidAccessToken(organizationId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: tokenRow } = await supabase
    .from("google_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!tokenRow) return null;

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  const stillValid = expiresAt - Date.now() > 60_000; // margen de 1 min
  if (stillValid) return tokenRow.access_token;

  if (!tokenRow.refresh_token) {
    // El access_token expiró y no hay refresh_token (Google solo lo entrega
    // la primera vez que se autoriza con prompt=consent): hay que reconectar.
    return null;
  }

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  await supabase
    .from("google_oauth_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("organization_id", organizationId);

  return refreshed.access_token;
}

export interface GoogleCalendarEventInput {
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string; // ISO
  timeZone: string;
  attendeeEmails: string[];
}

export interface GoogleCalendarEventResult {
  googleEventId: string;
  htmlLink: string;
}

/**
 * Crea el evento en el Google Calendar del propietario (la cuenta
 * conectada para la organización) con los asistentes indicados. Con
 * sendUpdates=all, Google Calendar le manda la invitación por correo a
 * cada asistente automáticamente — no hace falta reimplementar eso.
 */
export async function createGoogleCalendarEvent(
  organizationId: string,
  event: GoogleCalendarEventInput,
): Promise<GoogleCalendarEventResult | null> {
  const accessToken = await getValidAccessToken(organizationId);
  if (!accessToken) return null;

  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?sendUpdates=all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startAt, timeZone: event.timeZone },
      end: { dateTime: event.endAt, timeZone: event.timeZone },
      attendees: event.attendeeEmails.map((email) => ({ email })),
    }),
  });

  if (!res.ok) {
    console.error("Google Calendar API error", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return { googleEventId: data.id, htmlLink: data.htmlLink };
}

/**
 * Actualiza un evento ya creado en el Google Calendar del propietario.
 * Silencioso si no hay conexión o si la API falla (el evento en EditFlow ya
 * quedó guardado; Google es un espejo, no la fuente de verdad).
 */
export async function updateGoogleCalendarEvent(
  organizationId: string,
  googleEventId: string,
  event: GoogleCalendarEventInput,
): Promise<GoogleCalendarEventResult | null> {
  const accessToken = await getValidAccessToken(organizationId);
  if (!accessToken) return null;

  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${googleEventId}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startAt, timeZone: event.timeZone },
      end: { dateTime: event.endAt, timeZone: event.timeZone },
      attendees: event.attendeeEmails.map((email) => ({ email })),
    }),
  });

  if (!res.ok) {
    console.error("Google Calendar update error", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return { googleEventId: data.id, htmlLink: data.htmlLink };
}

/** Borra el espejo en Google Calendar. Silencioso si no hay conexión. */
export async function deleteGoogleCalendarEvent(
  organizationId: string,
  googleEventId: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(organizationId);
  if (!accessToken) return;

  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${googleEventId}?sendUpdates=all`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 410 && res.status !== 404) {
    console.error("Google Calendar delete error", res.status, await res.text());
  }
}

export interface GoogleRawEvent {
  id: string;
  status: string; // "confirmed" | "cancelled" | ...
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  attendees?: { email: string }[];
}

export interface ListEventsResult {
  events: GoogleRawEvent[];
  nextSyncToken: string | null;
  /** El syncToken guardado ya no sirve (Google respondió 410 Gone): hay que
   *  reintentar sin él, arrancando de cero desde `timeMin`. */
  needsFullResync: boolean;
}

/**
 * Trae los eventos del calendario conectado. Con syncToken solo devuelve lo
 * que cambió desde la última corrida (incluye cancelaciones); sin él, es la
 * primera sincronización y se acota a partir de `timeMinIso` para no
 * importar años de eventos viejos.
 */
export async function listCalendarEvents(
  organizationId: string,
  { syncToken, timeMinIso }: { syncToken?: string | null; timeMinIso: string },
): Promise<ListEventsResult | null> {
  const accessToken = await getValidAccessToken(organizationId);
  if (!accessToken) return null;

  const events: GoogleRawEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({ maxResults: "250", singleEvents: "true" });
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      params.set("timeMin", timeMinIso);
      params.set("orderBy", "startTime");
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 410) {
      return { events: [], nextSyncToken: null, needsFullResync: true };
    }
    if (!res.ok) {
      console.error("Google Calendar list error", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken, needsFullResync: false };
}
