import { NextResponse } from "next/server";
import { cronSecret } from "@/lib/supabase/env";

/**
 * Valida el cron que llama a /api/cron/*. Acepta el secreto de dos formas:
 * header Authorization: Bearer <CRON_SECRET> (lo que manda Vercel Cron), o
 * ?secret=<CRON_SECRET> en la URL — algunos servicios de cron gratuitos
 * (cron-job.org en el plan free) no mandan bien headers personalizados, y
 * el query param es la forma más compatible de cubrirlos a todos.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const secret = cronSecret();
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return null;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return null;

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
