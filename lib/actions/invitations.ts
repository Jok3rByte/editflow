"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";
import { appUrl } from "@/lib/supabase/env";
import { GMAIL_SEND_SCOPE } from "@/lib/google/gmail";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import type { InvitationStatus, MemberRole } from "@/types/database.types";

const ROL_LABEL: Record<MemberRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Estratega (solo lectura)",
};

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

export type CreateInvitationResult =
  | { ok: true; link: string; emailSent: boolean }
  | { ok: false; error: string };

/**
 * Crea la invitación y, si hay transporte de correo, le manda al invitado un
 * correo de EditFlow con el mismo enlace de ingreso (/invitacion/[token]).
 * El correo sale directo desde el Gmail del propietario si conectó ese scope
 * (máxima entregabilidad) y cae a Resend si no. Siempre se devuelve el link
 * igual, para compartir a mano si el envío no estaba disponible.
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
  const invitedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("invitations")
    .insert({ organization_id: organizationId, email: invitedEmail, role })
    .select("token")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la invitación." };
  }

  const link = `${appUrl()}/invitacion/${data.token}`;

  // El envío nunca debe tumbar la creación: si falla o no hay transporte, la
  // invitación ya quedó y el link se devuelve para compartir a mano.
  let emailSent = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: inviter } = await supabase
      .from("memberships")
      .select("id, email, full_name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .eq("user_id", user?.id ?? "")
      .maybeSingle();

    if (inviter) {
      const { data: conn } = await supabase
        .from("google_oauth_tokens")
        .select("scope")
        .eq("membership_id", inviter.id)
        .maybeSingle();

      const result = await sendInvitationEmail({
        to: invitedEmail,
        senderMembershipId: inviter.id,
        inviterEmail: inviter.email,
        gmailSendAvailable: Boolean(conn?.scope?.includes(GMAIL_SEND_SCOPE)),
        organizationName: org.name,
        inviterName: inviter.full_name || inviter.email,
        roleLabel: ROL_LABEL[role],
        inviteUrl: link,
      });
      emailSent = result.sent;
    }
  } catch (err) {
    console.error("[createInvitation] no se pudo enviar el correo de invitación", err);
  }

  revalidatePath("/app/equipo");
  return { ok: true, link, emailSent };
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
