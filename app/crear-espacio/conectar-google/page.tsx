"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { startGoogleConnect } from "@/lib/google/start-connect";

/**
 * Paso obligatorio del onboarding, automático: a cualquiera que crea su
 * cuenta (por link mágico o por Google sin haber otorgado los permisos de
 * Calendar/Gmail en el mismo signup) createOrganization lo manda acá en vez
 * de directo al dashboard. Dispara el consentimiento de Google apenas
 * carga la página, sin esperar un clic — así las invitaciones, recordatorios
 * y notificaciones por correo quedan listos desde el primer momento.
 */
export default function ConectarGooglePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startGoogleConnect("/app/dashboard").then((result) => {
      if (result.error) setError(result.error);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {!error ? (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <div>
            <p className="font-medium">Conectando tu cuenta de Google…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Para que las invitaciones, recordatorios y notificaciones salgan por correo
              automáticamente.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="font-medium text-danger">No se pudo conectar con Google</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Reintentar
          </button>
          <Link
            href="/app/dashboard"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Omitir por ahora — conectar después desde Configuración
          </Link>
        </>
      )}
    </div>
  );
}
