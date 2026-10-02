"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { createOrganization, type ActionResult } from "@/lib/actions/organizations";

const INITIAL_STATE: ActionResult = { ok: true };

const TIMEZONES = [
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Santiago", label: "Santiago (GMT-4/3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1/2)" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creando espacio..." : "Crear espacio"}
    </Button>
  );
}

export function WorkspaceForm() {
  const [state, formAction] = useActionState(async (_prev: ActionResult, fd: FormData) => {
    return createOrganization(fd);
  }, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre de tu empresa o marca personal</Label>
        <Input id="name" name="name" placeholder="Productora Lean" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Tipo</Label>
        <NativeSelect id="type" name="type" defaultValue="productora" className="w-full">
          <NativeSelectOption value="agencia">Agencia</NativeSelectOption>
          <NativeSelectOption value="productora">Productora</NativeSelectOption>
          <NativeSelectOption value="creador">Creador independiente</NativeSelectOption>
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="timezone">Zona horaria</Label>
        <NativeSelect id="timezone" name="timezone" defaultValue="America/Bogota" className="w-full">
          {TIMEZONES.map((tz) => (
            <NativeSelectOption key={tz.value} value={tz.value}>
              {tz.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {!state.ok && <p className="text-sm text-danger">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
