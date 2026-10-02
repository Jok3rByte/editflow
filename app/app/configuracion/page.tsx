import { AlertTriangle, Settings } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";
import { GoogleCalendarConnection } from "@/components/settings/google-calendar-connection";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string }>;
}) {
  const { google_error: googleError } = await searchParams;
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS solo deja ver la conexión propia del usuario, así que esta consulta
  // trae su fila (si conectó) — cada miembro gestiona la suya.
  const { data: googleConnection } = await supabase
    .from("google_oauth_tokens")
    .select("google_email")
    .eq("organization_id", org.id)
    .maybeSingle();

  const miCorreo = user?.email ?? "";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Mi integración de Google</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Conecta <span className="font-medium text-foreground">tu propia cuenta de Google</span> (el
          mismo correo con el que ingresas a EditFlow). Así los eventos que te asignen se agendan en
          TU Google Calendar y las notificaciones te llegan a tu propio correo. Cada miembro conecta
          la suya por separado.
        </p>

        {googleError === "email_mismatch" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Esa cuenta de Google no es <span className="font-medium">{miCorreo}</span> — el correo
              con el que ingresas a EditFlow. Elige exactamente esa cuenta para conectar tu Google
              Calendar y Gmail.
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
            También funciona al revés: un evento creado directo en tu Google Calendar (o por Siri) se
            importa acá solo si el título o la descripción tiene la palabra{" "}
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
