"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import type { Database, VideoPriority, VideoStatus } from "@/types/database.types";

type VideoUpdate = Database["public"]["Tables"]["videos"]["Update"];

export type VideoActionResult = { ok: true } | { ok: false; error: string };

export interface CreateVideoInput {
  periodId: string;
  clientId: string;
  title: string;
  editorId?: string | null;
  startDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null;
  priority?: VideoPriority;
}

export async function createVideo(input: CreateVideoInput): Promise<VideoActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para registrar videos." };
  }
  if (!input.title.trim()) {
    return { ok: false, error: "El título es obligatorio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("videos").insert({
    organization_id: org.id,
    period_id: input.periodId,
    client_id: input.clientId,
    title: input.title.trim(),
    editor_id: input.editorId || null,
    start_date: input.startDate || null,
    due_date: input.dueDate || null,
    priority: input.priority ?? "media",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/monitoreo");
  return { ok: true };
}

export interface UpdateVideoInput {
  id: string;
  clientId?: string;
  title?: string;
  editorId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: VideoPriority;
  status?: VideoStatus;
  progreso?: number;
  observations?: string | null;
  processedLink?: string | null;
}

// La restricción de qué columnas puede tocar un editor (solo estado,
// observaciones y link procesado) la aplica el trigger
// enforce_editor_video_columns en Postgres — este action solo arma el patch
// y deja que la base rechace con su propio mensaje si no corresponde.
export async function updateVideo(input: UpdateVideoInput): Promise<VideoActionResult> {
  await requireActiveOrganization();
  const supabase = await createClient();

  const patch: VideoUpdate = {};
  if (input.clientId !== undefined) patch.client_id = input.clientId;
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.editorId !== undefined) patch.editor_id = input.editorId || null;
  if (input.startDate !== undefined) patch.start_date = input.startDate || null;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate || null;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.progreso !== undefined) patch.progreso = input.progreso;
  if (input.observations !== undefined) patch.observations = input.observations || null;
  if (input.processedLink !== undefined) patch.processed_link = input.processedLink || null;

  const { error } = await supabase.from("videos").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/monitoreo");
  revalidatePath("/app/calendario"); // due_date mueve el evento virtual de entrega
  return { ok: true };
}

export async function deleteVideo(videoId: string): Promise<VideoActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "No tienes permiso para eliminar videos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/monitoreo");
  revalidatePath("/app/calendario");
  return { ok: true };
}
