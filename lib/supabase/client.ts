import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// Acceso estático (process.env.NEXT_PUBLIC_X, no process.env[nombre]) a
// propósito: es lo único que Next.js puede inyectar en el bundle del
// navegador en build time. El helper dinámico de ./env (requireEnv) solo
// sirve del lado del servidor, donde process.env sí existe en runtime.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
