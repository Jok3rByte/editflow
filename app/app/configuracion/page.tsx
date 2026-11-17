import { AlertTriangle, Settings } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";
import { GoogleCalendarConnection } from "@/components/settings/google-calendar-connection";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string }>;
}) {
  const { google_error: googleError } = await searchParams;
  const org = await requireActiveOrganization();
  const puedeGestionar = org.role === "owner" || org.role === "admin";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Conexión propia del miembro (migración 0012: 1 fila por membership).
  const { data: googleConnection } = await supabase
    .from("google_oauth_tokens")
    .select("google_email")
    .eq("membership_id", org.membershipId)
    .maybeSingle();

  const { data: perfil } = await supabase
    .from("memberships")
    .select("full_name, avatar_url, bio, phone")
    .eq("organization_id", org.id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const miCorreo = user?.email ?? "";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Mi perfil</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Tu nombre y tu foto son los que aparecen en la app. La biografía y el teléfono son
          opcionales.
        </p>
        <ProfileSettings
          userId={user?.id ?? ""}
          email={miCorreo}
          fullName={perfil?.full_name ?? ""}
          avatarUrl={perfil?.avatar_url ?? null}
          bio={perfil?.bio ?? null}
          phone={perfil?.phone ?? null}
          puedeEditarNombre={puedeGestionar}
        />
      </section>

      <section className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Integración de Google</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Conecta <span className="font-medium text-foreground">tu cuenta de Google</span> (el
          mismo correo con el que ingresas a EditFlow). Es la cuenta donde se reflejan tus eventos y
          reuniones con Meet, y desde la que salen tus notificaciones por correo.
        </p>

        {googleError === "email_mismatch" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Esa cuenta de Google no es <span className="font-medium">{miCorreo}</span> — el
              correo con el que ingresas a EditFlow. Elige exactamente esa cuenta para conectar
              tu Google Calendar y Gmail.
            </p>
          </div>
        )}

        <div className="mt-4">
          <GoogleCalendarConnection
            connected={Boolean(googleConnection)}
            googleEmail={googleConnection?.google_email}
            accountEmail={miCorreo}
          />
        </div>
        {googleConnection && (
          <p className="mt-3 text-xs text-muted-foreground">
            También funciona al revés: un evento creado directo en tu Google Calendar (o por Siri)
            se importa acá solo si el título o la descripción tiene la palabra{" "}
            <span className="font-mono text-foreground">Flow</span> — así ningún evento personal se
            mezcla con el del equipo. Se revisa cada 10 minutos.
          </p>
        )}
      </section>

      <ComingSoon
        icon={Settings}
        title="Configuración"
        description="Aquí vivirá la gestión de la organización, zona horaria, periodos y estrategas frecuentes. Próxima fase de construcción."
      />
    </div>
  );
}
