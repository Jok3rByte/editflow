"use client";

import { useTransition } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions/invitations";

export function AcceptInvitationButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvitation(token);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={isPending} onClick={handleAccept}>
        {isPending ? "Aceptando..." : "Aceptar invitación"}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
