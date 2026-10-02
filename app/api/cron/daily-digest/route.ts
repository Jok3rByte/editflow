import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron/auth";
import { sendDailyDigests } from "@/lib/notifications/daily-digest";

/**
 * Disparado cada hora por un servicio de cron externo (ver README). Manda
 * el resumen diario solo a las organizaciones donde ya son las 8am locales
 * y todavía no se les mandó hoy.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const resultado = await sendDailyDigests();
  return NextResponse.json({ ok: true, ...resultado });
}
