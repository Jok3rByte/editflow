"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PERIOD_COOKIE } from "@/lib/period/resolve";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type OpenPeriodResult = { ok: true; periodId: string } | { ok: false; error: string };

export async function setActivePeriod(periodId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PERIOD_COOKIE, periodId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/app", "layout");
}

export interface OpenPeriodInput {
  organizationId: string;
  year: number;
  month: number;
  clientIds: string[];
  goals: number[];
}

export async function openPeriod(input: OpenPeriodInput): Promise<OpenPeriodResult> {
  const supabase = await createClient();
  const { data: periodId, error } = await supabase.rpc("open_period", {
    p_org: input.organizationId,
    p_year: input.year,
    p_month: input.month,
    p_client_ids: input.clientIds,
    p_goals: input.goals,
  });

  if (error || !periodId) {
    return { ok: false, error: error?.message ?? "No se pudo abrir el mes." };
  }

  await setActivePeriod(periodId);
  revalidatePath("/app", "layout");
  return { ok: true, periodId };
}

export async function closePeriod(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_period", { p_period_id: periodId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function reopenPeriod(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_period", { p_period_id: periodId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function deleteEmptyPeriod(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_empty_period", { p_period_id: periodId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function carryOverVideo(videoId: string, targetPeriodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("carry_over_video", {
    p_video_id: videoId,
    p_target_period_id: targetPeriodId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/monitoreo");
  return { ok: true };
}
