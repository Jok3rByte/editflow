"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
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

/**
 * El invitado entra con su correo (el mismo de la invitación) y una
 * contraseña que él crea. Si es la primera vez, se crea su cuenta ya
 * confirmada (sin correo de confirmación); si ya la tenía, inicia sesión con
 * la misma contraseña. Luego acepta la invitación. Así puede volver a entrar
 * con correo+contraseña cada vez, sin usar el link de invitación de nuevo.
 */
export async function ingresarConInvitacion(token: string, password: string): Promise<ActionResult> {
  if (!/^\d{4,}$/.test(password)) {
    return { ok: false, error: "La contraseña debe ser de al menos 4 dígitos (solo números)." };
  }

  const supabase = await createClient();
  const { data: invData } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = invData?.[0];
  if (!inv) return { ok: false, error: "La invitación no existe o ya no está disponible." };
  if (inv.status === "revocada") return { ok: false, error: "Esta invitación fue revocada." };

  const email = inv.email;
  const admin = createServiceRoleClient();

  // Crea la cuenta confirmada si no existe (sin mandar correo). Si ya existe,
  // se ignora y se intenta iniciar sesión con la contraseña dada.
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr && !/registered|already|exist/i.test(createErr.message)) {
    return { ok: false, error: createErr.message };
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    return {
      ok: false,
      error: "Contraseña incorrecta. Si ya habías creado una, ingrésala; si la olvidaste, pide una invitación nueva.",
    };
  }

  const { error: acceptErr } = await supabase.rpc("accept_invitation", { p_token: token, p_full_name: email });
  if (acceptErr) return { ok: false, error: acceptErr.message };

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
  fullName: string,
): Promise<CreateInvitationResult> {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    return { ok: false, error: "Solo el propietario o un administrador puede invitar miembros." };
  }
  if (!fullName.trim()) {
    return { ok: false, error: "Ponle un nombre al invitado — así aparecerá en la app." };
  }

  const supabase = await createClient();
  const invitedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("invitations")
    .insert({ organization_id: organizationId, email: invitedEmail, role, full_name: fullName.trim() })
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
