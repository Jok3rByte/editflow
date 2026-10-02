"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabelEs } from "@/lib/utils/dates";
import { openPeriod } from "@/lib/actions/periods";

export function OpenCurrentMonthBanner({
  organizationId,
  year,
  month,
}: {
  organizationId: string;
  year: number;
  month: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (dismissed) return null;

  const label = `${monthLabelEs(month)} ${year}`;

  function handleOpen() {
    startTransition(async () => {
      const result = await openPeriod({ organizationId, year, month, clientIds: [], goals: [] });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-info/10 px-4 py-2.5 text-sm">
      <span>
        Estás en <span className="font-medium capitalize">{label}</span> y aún no has abierto el
        mes. ¿Abrir {label.toUpperCase()}?
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={isPending} onClick={handleOpen}>
          {isPending ? "Abriendo..." : `Abrir ${label}`}
        </Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setDismissed(true)}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
