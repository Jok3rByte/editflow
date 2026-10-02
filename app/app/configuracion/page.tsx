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
  const puedeGestionar = org.role === "owner" || org.role === "admin";
  const supabase = await createClient();
  const { data: googleConnection } = await supabase
    .from("google_oauth_tokens")
    .select("google_email")
    .eq("organization_id", org.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Integraciones</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          El correo que conectes acá es la cuenta que crea los eventos en Google Calendar y desde
          la que salen las notificaciones (literalmente, desde su bandeja de envío de Gmail). El
          propietario recibe todos los eventos; cada invitado solo recibe el que le asignaron.
        </p>

        {!puedeGestionar && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Solo el propietario o un administrador puede gestionar las integraciones y la
              configuración de la organización.
            </p>
          </div>
        )}

        {puedeGestionar && googleError === "email_mismatch" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Esa cuenta de Google no es <span className="font-medium">{org.ownerEmail}</span> — el
              correo con el que se registró el propietario. Elige exactamente esa cuenta para
              conectar Google Calendar y Gmail.
            </p>
          </div>
        )}

        {puedeGestionar && (
          <div className="mt-4">
            <GoogleCalendarConnection
              connected={Boolean(googleConnection)}
              googleEmail={googleConnection?.google_email}
              accountEmail={org.ownerEmail}
            />
          </div>
        )}
        {puedeGestionar && googleConnection && (
          <p className="mt-3 text-xs text-muted-foreground">
            También funciona al revés: un evento creado directo en Google Calendar (o por Siri) se
            importa acá solo si el título o la descripción tiene la palabra{" "}
            <span className="font-mono text-foreground">Flow</span> — así ningún evento personal
            se mezcla con el calendario del equipo. Se revisa cada 10 minutos.
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
