"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { updateClient, type ActionResult } from "@/lib/actions/clients";
import { ClientBriefFields } from "@/components/clients/client-brief-fields";

const INITIAL_STATE: ActionResult = { ok: true };

export interface ClientFull {
  id: string;
  name: string;
  brand_name: string | null;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_links: { instagram?: string; tiktok?: string; youtube?: string } | null;
  brand_description: string | null;
  target_audience: string | null;
  do_not_do: string | null;
  delivery_formats: string[] | null;
  default_monthly_goal: number;
  default_strategist: string | null;
  assets_drive_url: string | null;
  notes: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  );
}

// Se abre directo al hacer clic en la tarjeta del cliente (sin paso
// intermedio) — controlado desde afuera para que un solo Sheet sirva para
// cualquiera de las tarjetas de la grilla. El padre debe montarlo con
// key={client?.id ?? "closed"} para que el estado del form (y cualquier
// error previo) arranque limpio cada vez que se abre para un cliente
// distinto, en vez de arrastrar el estado del anterior.
export function EditClientSheet({
  client,
  open,
  onOpenChange,
}: {
  client: ClientFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction] = useActionState(async (_prev: ActionResult, fd: FormData) => {
    if (!client) return INITIAL_STATE;
    const result = await updateClient(client.id, fd);
    if (result.ok) onOpenChange(false);
    return result;
  }, INITIAL_STATE);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Editar brief — {client?.name}</SheetTitle>
        </SheetHeader>

        {client && (
          <form action={formAction} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
            <ClientBriefFields
              defaults={{
                name: client.name,
                brandName: client.brand_name ?? undefined,
                industry: client.industry ?? undefined,
                instagram: client.social_links?.instagram,
                tiktok: client.social_links?.tiktok,
                youtube: client.social_links?.youtube,
                contactName: client.contact_name ?? undefined,
                contactPhone: client.contact_phone ?? undefined,
                contactEmail: client.contact_email ?? undefined,
                brandDescription: client.brand_description ?? undefined,
                targetAudience: client.target_audience ?? undefined,
                doNotDo: client.do_not_do ?? undefined,
                deliveryFormats: client.delivery_formats ?? undefined,
                monthlyGoal: client.default_monthly_goal,
                strategist: client.default_strategist ?? undefined,
                assetsUrl: client.assets_drive_url ?? undefined,
                notes: client.notes ?? undefined,
              }}
            />

            {!state.ok && <p className="text-sm text-danger">{state.error}</p>}

            <SheetFooter className="mt-auto flex-row justify-end gap-2 px-0">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </SheetClose>
              <SubmitButton />
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
