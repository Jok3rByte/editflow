"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import type { MemberRole } from "@/types/database.types";

export type MembershipActionResult = { ok: true } | { ok: false; error: string };

export async function updateMemberRole(membershipId: string, role: MemberRole): Promise<MembershipActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede cambiar roles." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("memberships").update({ role }).eq("id", membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/equipo");
  return { ok: true };
}

// Desactiva en vez de borrar: preserva la atribución en videos/eventos
// pasados (editor_id, created_by, etc.) en vez de dejarla huérfana.
export async function removeMember(membershipId: string): Promise<MembershipActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede remover miembros." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("memberships").update({ active: false }).eq("id", membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/equipo");
  return { ok: true };
}
