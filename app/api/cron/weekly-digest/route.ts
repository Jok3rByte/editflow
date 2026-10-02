import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron/auth";
import { sendWeeklyDigests } from "@/lib/notifications/weekly-digest";

/**
 * Disparado cada hora por un servicio de cron externo (ver README). Manda
 * el resumen semanal solo los lunes a las 8am locales de cada organización.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const resultado = await sendWeeklyDigests();
  return NextResponse.json({ ok: true, ...resultado });
}
