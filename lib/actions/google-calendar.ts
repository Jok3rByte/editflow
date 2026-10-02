"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";

export async function disconnectGoogleCalendar() {
  const org = await requireActiveOrganization();
  if (org.role !== "owner" && org.role !== "admin") {
    throw new Error("Solo el propietario o un administrador puede desconectar Google Calendar.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("google_oauth_tokens")
    .delete()
    .eq("organization_id", org.id);

  if (error) throw new Error(error.message);

  revalidatePath("/app/configuracion");
}
