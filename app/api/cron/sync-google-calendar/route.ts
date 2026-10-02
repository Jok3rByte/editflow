import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron/auth";
import { syncAllOrganizations } from "@/lib/google/sync-calendar";

/**
 * Disparado cada 10 minutos por un servicio de cron externo (ver README,
 * sección de despliegue) mandando Authorization: Bearer <CRON_SECRET>.
 *
 * Por cada organización con Google Calendar conectado, trae los eventos
 * nuevos/editados/cancelados desde la última corrida e importa a
 * calendar_events solo los que tengan la palabra clave "Flow" en el
 * título o la descripción.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const resultados = await syncAllOrganizations();
  return NextResponse.json({ ok: true, resultados });
}
