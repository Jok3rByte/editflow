"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/lib/period/resolve";

// Cada quien desconecta ÚNICAMENTE su propia conexión. No hay chequeo de rol
// porque es una integración personal (de su perfil); la policy RLS limita el
// delete a la fila del propio usuario.
export async function disconnectGoogleCalendar() {
  const org = await requireActiveOrganization();

  const supabase = await createClient();
  const { error } = await supabase
    .from("google_oauth_tokens")
    .delete()
    .eq("organization_id", org.id);

  if (error) throw new Error(error.message);

  revalidatePath("/app/configuracion");
}
