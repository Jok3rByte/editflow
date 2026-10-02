"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, RotateCcw, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PreviewShell } from "@/components/preview/preview-shell";
import { puedeEditar, useSessionRole } from "@/lib/preview/session";

interface Periodo {
  label: string;
  status: "abierto" | "cerrado";
  resumen: string;
}

const PERIODOS_INICIALES: Periodo[] = [
  { label: "NOVIEMBRE 2025", status: "abierto", resumen: "0/50 videos entregados" },
  { label: "OCTUBRE 2025", status: "cerrado", resumen: "2/50 videos entregados" },
];

export default function ConfiguracionPreviewPage() {
  const [periodos, setPeriodos] = useState(PERIODOS_INICIALES);
  const [nombreOrg, setNombreOrg] = useState("Productora Lean");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rol] = useSessionRole();
  const editable = puedeEditar(rol);

  function toggleEstado(label: string) {
    if (!editable) return;
    setPeriodos((prev) =>
      prev.map((p) => {
        if (p.label !== label) return p;
        const nuevo: Periodo["status"] = p.status === "abierto" ? "cerrado" : "abierto";
        toast.success(
          nuevo === "cerrado" ? `${label} cerrado — snapshot generado` : `${label} reabierto`,
        );
        return { ...p, status: nuevo };
      }),
    );
  }

  return (
    <PreviewShell active="Configuración">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">Productora Lean</p>
        </div>

        <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold">Organización</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-org-nombre">Nombre</Label>
              <Input
                id="p-org-nombre"
                value={nombreOrg}
                disabled={!editable}
                onChange={(e) => setNombreOrg(e.target.value)}
                onBlur={() => editable && toast.success("Nombre de la organización actualizado")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Zona horaria</Label>
              <Input value="America/Bogota (GMT-5)" disabled />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold">Periodos</h3>
          <div className="mt-3 space-y-2">
            {periodos.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div>
                  <p className="font-mono text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.resumen}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={p.status === "abierto" ? "default" : "outline"}
                    className={p.status === "abierto" ? "bg-info/15 text-info ring-1 ring-info/40" : ""}
                  >
                    {p.status === "abierto" ? "Abierto" : "Cerrado"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleEstado(p.label)} disabled={!editable}>
                    {p.status === "abierto" ? (
                      <>
                        <Lock className="size-3.5" /> Cerrar
                      </>
                    ) : (
                      <>
                        <Unlock className="size-3.5" /> Reabrir
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold">Estrategas frecuentes</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Productora</Badge>
          </div>
        </div>

        <div className="rounded-xl border border-danger/30 bg-danger/5 p-5">
          <h3 className="font-heading text-sm font-semibold text-danger">Zona de riesgo</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Eliminar el espacio borra toda la información de forma permanente.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => setDeleteOpen(true)}
            disabled={!editable}
          >
            <RotateCcw className="size-3.5" />
            Eliminar espacio
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Productora Lean?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta es una vista previa: no se borra nada de verdad. En la app real esta acción es
              irreversible y borra clientes, videos, eventos y métricas de todos los meses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={() => {
                setDeleteOpen(false);
                toast("Esto es solo una vista previa — nada se eliminó.");
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PreviewShell>
  );
}
