"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/supabase/env";
import { ACCOUNT_STEP_SCHEMA } from "@/lib/validations/organization";

export interface MagicLinkState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export async function sendMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = ACCOUNT_STEP_SCHEMA.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const next = (formData.get("next") as string | null) || "/crear-espacio/espacio";
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", message: parsed.data.email };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export interface UpdateProfileInput {
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
}

export type ProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Actualiza el perfil del usuario actual (nombre, foto, bio, teléfono) en
 * todas sus membresías. Usa service role acotado a su propio user_id porque
 * la RLS de memberships_update es solo para owner/admin; acá solo se tocan
 * campos de perfil (nunca el rol), así que es seguro.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No has iniciado sesión." };

  const nombre = input.fullName.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("memberships")
    .update({
      full_name: nombre,
      avatar_url: input.avatarUrl,
      bio: input.bio?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  return { ok: true };
}
