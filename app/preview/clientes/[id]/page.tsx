"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { PreviewShell } from "@/components/preview/preview-shell";
import { EstrategaSelect } from "@/components/preview/estratega-select";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import {
  CLIENTES_INICIALES,
  PREVIEW_CLIENTES_KEY,
  type PreviewCliente,
} from "@/lib/preview/clients-data";

function field<K extends keyof PreviewCliente>(
  cliente: PreviewCliente,
  key: K,
  set: (updater: (c: PreviewCliente) => PreviewCliente) => void,
) {
  return {
    value: cliente[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set((c) => ({ ...c, [key]: e.target.value })),
  };
}

export default function ClienteDetallePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [clientes, setClientes, hydrated] = useLocalStorageState<PreviewCliente[]>(
    PREVIEW_CLIENTES_KEY,
    CLIENTES_INICIALES,
  );

  const cliente = clientes.find((c) => c.id === params.id);

  function updateCliente(updater: (c: PreviewCliente) => PreviewCliente) {
    setClientes((prev) => prev.map((c) => (c.id === params.id ? updater(c) : c)));
  }

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Ficha del cliente guardada");
  }

  function handleEliminar() {
    setClientes((prev) => prev.filter((c) => c.id !== params.id));
    toast.success(`${cliente?.nombre} desactivado de este mes`);
    router.push("/preview/clientes");
  }

  if (!hydrated) {
    return (
      <PreviewShell active="Clientes">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PreviewShell>
    );
  }

  if (!cliente) {
    return (
      <PreviewShell active="Clientes">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-16 text-center">
          <p className="font-medium">Cliente no encontrado</p>
          <p className="text-sm text-muted-foreground">
            Puede que ya lo hayas desactivado, o que el localStorage se haya limpiado.
          </p>
          <Button asChild variant="outline">
            <Link href="/preview/clientes">Volver a Clientes</Link>
          </Button>
        </div>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell active="Clientes">
      <form onSubmit={handleGuardar} className="mx-auto max-w-3xl space-y-6 pb-16">
        <Link
          href="/preview/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a Clientes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-gradient">
              {cliente.nombre}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">OCTUBRE 2025 · Ficha del cliente</p>
          </div>
          {cliente.atrasados > 0 && (
            <Badge variant="destructive">{cliente.atrasados} atrasado(s)</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Meta del mes", value: `${cliente.finalizados}/${cliente.meta}` },
            { label: "Total videos", value: cliente.total },
            { label: "En curso", value: cliente.enCurso },
            { label: "% Alcance", value: `${cliente.alcanceMeta}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>
        <Progress value={cliente.alcanceMeta} />

        <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold text-primary">Identificación</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input {...field(cliente, "nombre", updateCliente)} />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input {...field(cliente, "marca", updateCliente)} placeholder="Sin definir" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Industria</Label>
            <Input {...field(cliente, "industria", updateCliente)} placeholder="Sin definir" />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold text-primary">Contacto</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre de contacto</Label>
              <Input {...field(cliente, "contactoNombre", updateCliente)} placeholder="Sin definir" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input {...field(cliente, "contactoTelefono", updateCliente)} placeholder="Sin definir" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Correo</Label>
            <Input type="email" {...field(cliente, "contactoEmail", updateCliente)} placeholder="Sin definir" />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold text-primary">Brief creativo</h3>
          <div className="space-y-1.5">
            <Label>Descripción de la marca</Label>
            <Textarea rows={2} {...field(cliente, "descripcion", updateCliente)} placeholder="Sin definir" />
          </div>
          <div className="space-y-1.5">
            <Label>Público objetivo</Label>
            <Textarea rows={2} {...field(cliente, "publicoObjetivo", updateCliente)} placeholder="Sin definir" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tono de voz</Label>
              <Input {...field(cliente, "tono", updateCliente)} placeholder="Sin definir" />
            </div>
            <div className="space-y-1.5">
              <Label>Qué NO hacer</Label>
              <Input {...field(cliente, "noHacer", updateCliente)} placeholder="Sin definir" />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h3 className="font-heading text-sm font-semibold text-primary">Operación</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Meta de videos del mes</Label>
              <Input
                type="number"
                min={0}
                value={cliente.meta}
                onChange={(e) => updateCliente((c) => ({ ...c, meta: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estratega</Label>
              <EstrategaSelect
                value={cliente.encargado}
                onChange={(nombre) => updateCliente((c) => ({ ...c, encargado: nombre }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea rows={3} {...field(cliente, "notas", updateCliente)} placeholder="Sin notas" />
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-border/60 pt-6">
          <Button type="button" variant="ghost" className="text-danger hover:text-danger" onClick={handleEliminar}>
            <Trash2 className="size-4" />
            Desactivar este mes
          </Button>
          <Button type="submit" className="glow-primary">
            <Save className="size-4" />
            Guardar cambios
          </Button>
        </div>
      </form>
    </PreviewShell>
  );
}
