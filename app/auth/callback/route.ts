import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { GMAIL_SEND_SCOPE } from "@/lib/google/gmail";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/crear-espacio/espacio";
  const linkingGoogleCalendar = searchParams.get("google_calendar") === "1";
  // Cuando Google/Supabase rechazan el intento ANTES de emitir un code
  // (ej. el correo de Google ya está registrado con otro proveedor), el
  // motivo real viene en estos query params — antes se perdía por completo
  // y solo se veía "enlace inválido o expirado" sin poder diagnosticar.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (linkingGoogleCalendar) {
        const outcome = await saveGoogleCalendarConnection(data.session);
        if (outcome === "email_mismatch") {
          const mismatchUrl = new URL(next, origin);
          mismatchUrl.searchParams.set("google_error", "email_mismatch");
          return NextResponse.redirect(mismatchUrl);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession falló:", error.message);
    const errorUrl = new URL("/crear-espacio", origin);
    errorUrl.searchParams.set("error", "auth");
    errorUrl.searchParams.set("error_detail", error.message);
    return NextResponse.redirect(errorUrl);
  }

  if (providerError) {
    console.error("[auth/callback] El proveedor OAuth devolvió un error:", providerError);
  }

  const errorUrl = new URL("/crear-espacio", origin);
  errorUrl.searchParams.set("error", "auth");
  if (providerError) errorUrl.searchParams.set("error_detail", providerError);
  return NextResponse.redirect(errorUrl);
}

/**
 * El botón "Conectar Google" en Configuración usa supabase.auth.linkIdentity()
 * (no signInWithOAuth) para vincular la cuenta de Google a la sesión ya
 * activa sin cambiar de usuario. El redirect de vuelta pasa igual por acá
 * con ?code=..., y la sesión que resulta trae provider_token /
 * provider_refresh_token porque se pidió con access_type=offline y
 * prompt=consent.
 *
 * Regla dura: la cuenta de Google conectada tiene que ser EXACTAMENTE la
 * misma con la que el propietario se registró (organizations.owner_email).
 * Si eligió otra cuenta en la pantalla de Google, se desvincula de una y no
 * se guarda ningún token.
 */
async function saveGoogleCalendarConnection(
  session: Session | null,
): Promise<"saved" | "email_mismatch" | "skipped"> {
  if (!session?.provider_token) return "skipped";

  const googleIdentity = session.user.identities?.find((i) => i.provider === "google");
  const googleEmail = (googleIdentity?.identity_data?.email as string | undefined) ?? session.user.email;
  if (!googleEmail) return "skipped";

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(owner_email)")
    .eq("active", true)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (!membership) return "skipped";

  const ownerEmail = (membership.organizations as unknown as { owner_email: string } | null)?.owner_email;

  if (!ownerEmail || ownerEmail.toLowerCase() !== googleEmail.toLowerCase()) {
    if (googleIdentity) {
      await supabase.auth.unlinkIdentity(googleIdentity);
    }
    return "email_mismatch";
  }

  // expires_in no viene en el objeto de sesión ya armado; Supabase expone
  // expires_at (segundos desde epoch) para el propio access_token de la
  // sesión, que es un buen proxy porque ambos tokens se emiten juntos.
  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : new Date(Date.now() + 3600_000).toISOString();

  await supabase.from("google_oauth_tokens").upsert(
    {
      organization_id: membership.organization_id,
      google_email: googleEmail,
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token ?? undefined,
      expires_at: expiresAt,
      scope: `${CALENDAR_SCOPE} ${GMAIL_SEND_SCOPE}`,
    },
    { onConflict: "organization_id" },
  );

  return "saved";
}
