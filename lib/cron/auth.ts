import { NextResponse } from "next/server";
import { cronSecret } from "@/lib/supabase/env";

/**
 * Valida el header Authorization: Bearer <CRON_SECRET> que mandan Vercel
 * Cron o el servicio externo (cron-job.org) configurado para disparar
 * /api/cron/*. Devuelve una respuesta 401 si falla, o null si puede seguir.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret()}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
