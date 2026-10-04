import { createClient } from "@/lib/supabase/client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

/**
 * Arranca el OAuth de Google pidiendo Calendar + Gmail send, y vuelve a
 * /auth/callback?...&google_calendar=1 (que guarda el token vía
 * saveGoogleCalendarConnection). Si Google es la única identidad de la
 * cuenta usa signInWithOAuth (no se puede desvincular); si hay otra
 * identidad (correo/contraseña) usa linkIdentity, desvinculando primero
 * cualquier Google viejo para poder re-pedir el consentimiento.
 */
export async function startGoogleConnect(
  nextPath: string,
  accountEmail?: string,
): Promise<{ error?: string }> {
  const supabase = createClient();

  const oauthOptions = {
    scopes: `${CALENDAR_SCOPE} ${GMAIL_SEND_SCOPE}`,
    queryParams: {
      access_type: "offline",
      prompt: "consent",
      ...(accountEmail ? { login_hint: accountEmail } : {}),
    },
    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}&google_calendar=1`,
  };

  const { data: identidades } = await supabase.auth.getUserIdentities();
  const todas = identidades?.identities ?? [];
  const googleIdentity = todas.find((i) => i.provider === "google");
  const tieneOtraIdentidad = todas.some((i) => i.provider !== "google");

  let error: { message: string } | null = null;

  if (googleIdentity && !tieneOtraIdentidad) {
    ({ error } = await supabase.auth.signInWithOAuth({ provider: "google", options: oauthOptions }));
  } else {
    if (googleIdentity) {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (unlinkError) return { error: unlinkError.message };
    }
    ({ error } = await supabase.auth.linkIdentity({ provider: "google", options: oauthOptions }));
  }

  return error ? { error: error.message } : {};
}
