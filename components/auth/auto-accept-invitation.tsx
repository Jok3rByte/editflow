"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions/invitations";

/**
 * Se monta solo cuando el usuario realmente navegó a la página (no durante el
 * prefetch de un <Link>, que no ejecuta efectos de cliente), así que aceptar
 * automáticamente aquí es seguro: entra directo al espacio al que fue invitado
 * sin un clic extra.
 */
export function AutoAcceptInvitation({
  token,
  organizationName,
}: {
  token: string;
  organizationName: string;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    acceptInvitation(token).then((result) => {
      if (result && !result.ok) setError(result.error);
    });
  }, [token]);

  if (error) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button onClick={() => acceptInvitation(token)}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Entrando a <strong className="text-foreground">{organizationName}</strong>...
      </p>
    </div>
  );
}
