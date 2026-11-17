"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";

// Cada miembro gestiona su propia conexión de Google (migración 0012 / RLS).
export async function disconnectGoogleCalendar() {
  const org = await requireActiveOrganization();

  const supabase = await createClient();
  const { error } = await supabase
    .from("google_oauth_tokens")
    .delete()
    .eq("membership_id", org.membershipId);

  if (error) throw new Error(error.message);

  revalidatePath("/app/configuracion");
}
