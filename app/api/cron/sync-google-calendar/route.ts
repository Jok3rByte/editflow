import { NextResponse } from "next/server";
import { cronSecret } from "@/lib/supabase/env";
import { syncAllOrganizations } from "@/lib/google/sync-calendar";

/**
 * Vercel Cron llama acá cada 10 minutos (ver vercel.json) mandando
 * Authorization: Bearer <CRON_SECRET> automáticamente porque la variable
 * de entorno CRON_SECRET está configurada en el proyecto.
 *
 * Por cada organización con Google Calendar conectado, trae los eventos
 * nuevos/editados/cancelados desde la última corrida e importa a
 * calendar_events solo los que tengan la palabra clave "Flow" en el
 * título o la descripción.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret()}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados = await syncAllOrganizations();
  return NextResponse.json({ ok: true, resultados });
}
