import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron/auth";
import { sendDueEventReminders } from "@/lib/notifications/reminders";

/**
 * Disparado cada 5 minutos por un servicio de cron externo (ver README).
 * Manda el recordatorio de los eventos de calendario que empiezan pronto.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const resultado = await sendDueEventReminders();
  return NextResponse.json({ ok: true, ...resultado });
}
