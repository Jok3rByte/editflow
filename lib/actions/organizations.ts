"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, withRandomSuffix } from "@/lib/utils/slug";
import { CREATE_ORGANIZATION_SCHEMA } from "@/lib/validations/organization";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createOrganization(formData: FormData): Promise<ActionResult> {
  const parsed = CREATE_ORGANIZATION_SCHEMA.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    timezone: formData.get("timezone") || "America/Bogota",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const baseSlug = slugify(parsed.data.name) || "espacio";
  const slug = withRandomSuffix(baseSlug);

  const { data: organizationId, error } = await supabase.rpc("create_organization_with_owner", {
    p_name: parsed.data.name,
    p_slug: slug,
    p_owner_email: user.email,
    p_timezone: parsed.data.timezone,
    p_full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email,
  });

  if (error || !organizationId) {
    return { ok: false, error: error?.message ?? "No se pudo crear el espacio." };
  }

  redirect("/app/dashboard");
}

export interface MyOrganization {
  id: string;
  name: string;
  role: string;
}

export async function getMyOrganizations(): Promise<MyOrganization[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name)")
    .eq("active", true);

  if (!data) return [];

  return data
    .filter((row) => row.organizations)
    .map((row) => {
      const org = row.organizations as unknown as { id: string; name: string };
      return { id: org.id, name: org.name, role: row.role };
    });
}
