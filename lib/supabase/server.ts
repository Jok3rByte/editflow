import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Cliente para Server Components / Server Actions / Route Handlers.
 * Respeta la sesión del usuario y por tanto las políticas RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Se llama desde un Server Component: el middleware ya refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente con la service role key: ignora RLS por completo.
 * Solo para tareas de servidor de confianza (crons, envío de correos,
 * triggers administrativos). Nunca exponer al cliente.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // El cliente de service role no maneja sesión de usuario.
      },
    },
  });
}
