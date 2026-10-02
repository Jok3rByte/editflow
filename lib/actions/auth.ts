"use server";

import { createClient } from "@/lib/supabase/server";
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
