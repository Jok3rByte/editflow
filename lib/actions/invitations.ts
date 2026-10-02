"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import { appUrl } from "@/lib/supabase/env";
import type { InvitationStatus, MemberRole } from "@/types/database.types";

export interface InvitationDetails {
  organizationName: string;
  email: string;
  role: MemberRole;
  status: InvitationStatus;
  expiresAt: string;
}

export async function getInvitationByToken(token: string): Promise<InvitationDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token });

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  return {
    organizationName: row.organization_name,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

export interface PendingInvitation {
  token: string;
  organizationName: string;
  role: MemberRole;
  expiresAt: string;
}

/**
 * Invitaciones pendientes para el correo de la sesión actual. Se usa después del
 * magic link (sin token en la URL) para que, si alguien fue invitado, aterrice
 * directo en ese espacio en vez de en el formulario de "crear mi propio espacio".
 */
export async function getMyPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_pending_invitations");

  if (error || !data) return [];

  return data.map((row) => ({
    token: row.token,
    organizationName: row.organization_name,
    role: row.role,
    expiresAt: row.expires_at,
  }));
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión con el correo invitado antes de aceptar." };
  }

  const { error } = await supabase.rpc("accept_invitation", {
    p_token: token,
    p_full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  redirect("/app/dashboard");
}

export type CreateInvitationResult = { ok: true; link: string } | { ok: false; error: string };

/**
 * Crea la invitación en la base y devuelve el link para compartir a mano
 * (/invitacion/[token]). Todavía no hay envío de correo automático (falta
 * configurar RESEND_API_KEY) — el propietario/admin copia y manda el link
 * por donde prefiera mientras tanto.
 */
export async function createInvitation(
  organizationId: string,
  email: string,
  role: MemberRole,
): Promise<CreateInvitationResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede invitar miembros." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({ organization_id: organizationId, email: email.trim().toLowerCase(), role })
    .select("token")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la invitación." };
  }

  revalidatePath("/app/equipo");
  return { ok: true, link: `${appUrl()}/invitacion/${data.token}` };
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede revocar invitaciones." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revocada" })
    .eq("id", invitationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/equipo");
  return { ok: true };
}
