import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron/auth";
import { sendMonthCloseReminders } from "@/lib/notifications/month-close-reminder";

/**
 * Disparado una vez al día por un servicio de cron externo (ver README).
 * Avisa a owner/admin cuando el mes en curso sigue abierto y está por
 * terminar.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const resultado = await sendMonthCloseReminders();
  return NextResponse.json({ ok: true, ...resultado });
}
