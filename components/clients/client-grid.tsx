"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EditClientSheet, type ClientFull } from "@/components/clients/edit-client-sheet";

interface ClientSummaryRow {
  client_id: string;
  cliente: string;
  encargado: string | null;
  meta_mensual: number;
  finalizados: number;
  total_videos: number;
  en_edicion: number;
  en_revision: number;
  atrasados: number;
  porcentaje_alcance_meta: number | null;
}

export function ClientGrid({
  summary,
  clientsById,
  canManage,
}: {
  summary: ClientSummaryRow[];
  clientsById: Record<string, ClientFull>;
  canManage: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingClient = editingId ? (clientsById[editingId] ?? null) : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((client) => (
          <button
            type="button"
            key={client.client_id}
            onClick={() => canManage && setEditingId(client.client_id)}
            disabled={!canManage}
            className="rounded-xl border bg-card p-5 text-left transition-colors enabled:hover:border-primary/50 enabled:cursor-pointer disabled:cursor-default"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{client.cliente}</h3>
                <p className="text-xs text-muted-foreground">{client.encargado}</p>
              </div>
              {client.atrasados > 0 && <Badge variant="destructive">{client.atrasados} atrasado(s)</Badge>}
            </div>

            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Meta del mes</span>
                <span className="tabular-nums">
                  {client.finalizados} / {client.meta_mensual}
                </span>
              </div>
              <Progress value={client.porcentaje_alcance_meta ?? 0} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="font-semibold tabular-nums">{client.total_videos}</p>
                <p className="text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="font-semibold tabular-nums">{client.en_edicion + client.en_revision}</p>
                <p className="text-muted-foreground">En curso</p>
              </div>
              <div>
                <p className="font-semibold tabular-nums">{client.finalizados}</p>
                <p className="text-muted-foreground">Finalizados</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <EditClientSheet
        key={editingClient?.id ?? "closed"}
        client={editingClient}
        open={Boolean(editingClient)}
        onOpenChange={(o) => !o && setEditingId(null)}
      />
    </>
  );
}
