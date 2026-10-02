"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDateEs, monthLabelEs } from "@/lib/utils/dates";
import { openPeriod } from "@/lib/actions/periods";

interface ClientOption {
  clientId: string;
  name: string;
  monthlyGoal: number;
}

interface PendingVideo {
  id: string;
  title: string;
  dueDate: string | null;
  clientName: string;
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = (() => {
  const y = new Date().getUTCFullYear();
  return [y - 1, y, y + 1];
})();

export function OpenPeriodWizard({
  organizationId,
  defaultYear,
  defaultMonth,
  continuingClients,
  otherClients,
  pendingVideos,
}: {
  organizationId: string;
  defaultYear: number;
  defaultMonth: number;
  continuingClients: ClientOption[];
  otherClients: ClientOption[];
  pendingVideos: PendingVideo[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(continuingClients.map((c) => [c.clientId, true])),
  );
  const [goals, setGoals] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      [...continuingClients, ...otherClients].map((c) => [c.clientId, c.monthlyGoal]),
    ),
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allClients = useMemo(
    () => [...continuingClients, ...otherClients],
    [continuingClients, otherClients],
  );
  const selectedIds = allClients.filter((c) => selected[c.clientId]).map((c) => c.clientId);

  function toggleClient(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      // El arrastre de pendientes/en edición/en revisión al día 1 de este
      // mes lo hace open_period() de una sola vez, en la misma transacción
      // que crea el periodo — no es un paso aparte ni algo que se pueda
      // saltar.
      const result = await openPeriod({
        organizationId,
        year,
        month,
        clientIds: selectedIds,
        goals: selectedIds.map((id) => goals[id] ?? 0),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/app/monitoreo");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-sm">
        {["Mes", "Clientes", "Pendientes"].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                step === i + 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={step === i + 1 ? "font-medium" : "text-muted-foreground"}>
              {label}
            </span>
            {i < 2 && <span className="mx-1 text-muted-foreground">—</span>}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4 rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Elige el mes y el año que vas a abrir.</p>
          <div className="flex gap-3">
            <NativeSelect value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MESES.map((m) => (
                <NativeSelectOption key={m} value={m}>
                  {monthLabelEs(m)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <NativeSelectOption key={y} value={y}>
                  {y}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">
            Marca los clientes que continúan este mes y ajusta su meta.
          </p>
          <div className="space-y-2">
            {allClients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no tienes clientes registrados. Podrás añadirlos después desde Clientes.
              </p>
            )}
            {allClients.map((client) => (
              <div key={client.clientId} className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={!!selected[client.clientId]}
                  onCheckedChange={() => toggleClient(client.clientId)}
                />
                <span className="flex-1 text-sm">{client.name}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={goals[client.clientId] ?? 0}
                  disabled={!selected[client.clientId]}
                  onChange={(e) =>
                    setGoals((prev) => ({ ...prev, [client.clientId]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button onClick={() => setStep(3)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">
            {pendingVideos.length > 0
              ? `Estos ${pendingVideos.length} videos no llegaron a "aprobado" — se trasladan solos, sin que hagas nada, al 1 de ${monthLabelEs(month)} de ${year}. Ningún video pendiente se pierde ni se puede borrar al cerrar el mes.`
              : "No hay videos pendientes, en edición o en revisión en tu último mes — nada que arrastrar."}
          </p>
          <div className="space-y-2">
            {pendingVideos.map((video) => (
              <div key={video.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex-1 text-sm">
                  {video.clientName} — {video.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  Vencía {formatDateEs(video.dueDate)}
                </span>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
              Atrás
            </Button>
            <Button onClick={handleFinish} disabled={isPending}>
              {isPending ? "Abriendo mes..." : "Abrir mes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
