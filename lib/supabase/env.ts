function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env.local y complétala.`,
    );
  }
  return value;
}

export const supabaseUrl = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const supabaseServiceRoleKey = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY");
export const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const cronSecret = () => requireEnv("CRON_SECRET");
export const googleClientId = () => requireEnv("GOOGLE_CLIENT_ID");
export const googleClientSecret = () => requireEnv("GOOGLE_CLIENT_SECRET");
export const resendApiKey = () => requireEnv("RESEND_API_KEY");
export const emailFrom = () => process.env.EMAIL_FROM ?? "EditFlow <notificaciones@editflow.app>";
