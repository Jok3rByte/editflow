"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ingresarConInvitacion } from "@/lib/actions/invitations";

export function InviteAuthForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { login_hint: email },
        redirectTo: `${window.location.origin}/auth/callback?next=/invitacion/${token}`,
      },
    });
    if (error) {
      toast.error("No se pudo iniciar con Google", { description: error.message });
      setGoogleLoading(false);
    }
  }

  function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,}$/.test(password)) {
      toast.error("La contraseña debe ser de al menos 4 dígitos (solo números).");
      return;
    }
    startTransition(async () => {
      const r = await ingresarConInvitacion(token, password);
      if (!r.ok) toast.error(r.error);
      // Si todo va bien, la acción redirige al dashboard.
    });
  }

  async function handleReset() {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
    });
    if (error) {
      toast.error("No se pudo enviar el correo", { description: error.message });
    } else {
      toast.success("Te enviamos un correo para restablecer tu contraseña.");
    }
  }

  return (
    <div className="space-y-4 text-left">
      <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={googleLoading}>
        {googleLoading ? "Redirigiendo…" : "Continuar con Google"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />o con tu correo<div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEntrar} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Tu correo</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pin">Contraseña (mínimo 4 dígitos)</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Entrando…" : "Entrar"}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña? Restablecer
        </button>
      </form>

      <p className="text-xs text-muted-foreground">
        La primera vez creas tu contraseña; después entras con tu correo y esa misma contraseña cuando
        quieras, sin volver a usar este enlace.
      </p>
    </div>
  );
}
