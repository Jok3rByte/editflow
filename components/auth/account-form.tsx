"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink, type MagicLinkState } from "@/lib/actions/auth";

const INITIAL_STATE: MagicLinkState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      <Mail className="size-4" />
      {pending ? "Enviando enlace..." : "Enviar enlace de acceso"}
    </Button>
  );
}

export function AccountForm({ next, modo }: { next: string; modo: "iniciar" | "acceso" }) {
  const [state, formAction] = useActionState(sendMagicLink, INITIAL_STATE);

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  if (state.status === "sent") {
    return (
      <div className="rounded-lg border bg-muted/40 p-6 text-center">
        <Mail className="mx-auto size-8 text-primary" />
        <p className="mt-3 font-medium">Revisa tu correo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Te enviamos un enlace de acceso a <strong>{state.message}</strong>. Ábrelo desde este
          mismo dispositivo para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
        Continuar con Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        o con tu correo
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" name="fullName" placeholder="Lean Productor" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" placeholder="lean@correo.com" required />
        </div>
        {state.status === "error" && (
          <p className="text-sm text-danger">{state.message}</p>
        )}
        <SubmitButton />
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {modo === "acceso"
          ? "Sin contraseña: te enviamos un enlace mágico a tu correo."
          : "Al continuar creas tu cuenta sin necesidad de contraseña."}
      </p>
    </div>
  );
}
