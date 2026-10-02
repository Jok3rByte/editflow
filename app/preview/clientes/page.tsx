"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PreviewShell } from "@/components/preview/preview-shell";
import { EstrategaSelect, SIN_ESTRATEGA } from "@/components/preview/estratega-select";
import { MemberAvatar } from "@/components/preview/member-avatar";
import { useLocalStorageState } from "@/lib/preview/use-local-storage-state";
import { MIEMBROS_INICIALES, PREVIEW_EQUIPO_KEY, type Miembro } from "@/lib/preview/team-data";
import {
  CARTERA_INACTIVA,
  CLIENTES_INICIALES,
  PREVIEW_CLIENTES_KEY,
  type PreviewCliente,
} from "@/lib/preview/clients-data";

export default function ClientesPreviewPage() {
  const [clientes, setClientes] = useLocalStorageState<PreviewCliente[]>(
    PREVIEW_CLIENTES_KEY,
    CLIENTES_INICIALES,
  );
  const [inactivos, setInactivos] = useState(CARTERA_INACTIVA);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [miembros] = useLocalStorageState<Miembro[]>(PREVIEW_EQUIPO_KEY, MIEMBROS_INICIALES);
  const miembroPorNombre = new Map(miembros.map((m) => [m.nombre, m]));

  const [nombre, setNombre] = useState("");
  const [meta, setMeta] = useState("0");
  const [encargado, setEncargado] = useState(SIN_ESTRATEGA);
  const [notas, setNotas] = useState("");

  function resetForm() {
    setNombre("");
    setMeta("0");
    setEncargado(SIN_ESTRATEGA);
    setNotas("");
  }

  function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    const nuevo: PreviewCliente = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      marca: "",
      industria: "",
      contactoNombre: "",
      contactoEmail: "",
      contactoTelefono: "",
      descripcion: "",
      publicoObjetivo: "",
      tono: "",
      noHacer: "",
      encargado: encargado || SIN_ESTRATEGA,
      meta: Number(meta) || 0,
      notas,
      finalizados: 0,
      total: 0,
      enCurso: 0,
      alcanceMeta: 0,
      atrasados: 0,
    };
    setClientes((prev) => [...prev, nuevo]);
    setSheetOpen(false);
    resetForm();
    toast.success(`${nuevo.nombre} registrado`, {
      description: "Activo este mes con meta de " + nuevo.meta + " videos.",
    });
  }

  function handleActivar(id: string) {
    const candidato = inactivos.find((c) => c.id === id);
    if (!candidato) return;
    setClientes((prev) => [
      ...prev,
      {
        id: candidato.id,
        nombre: candidato.nombre,
        marca: "",
        industria: "",
        contactoNombre: "",
        contactoEmail: "",
        contactoTelefono: "",
        descripcion: "",
        publicoObjetivo: "",
        tono: "",
        noHacer: "",
        encargado: SIN_ESTRATEGA,
        meta: candidato.meta,
        notas: "",
        finalizados: 0,
        total: 0,
        enCurso: 0,
        alcanceMeta: 0,
        atrasados: 0,
      },
    ]);
    setInactivos((prev) => prev.filter((c) => c.id !== id));
    toast.success(`${candidato.nombre} activado este mes`);
    if (inactivos.length === 1) setDialogOpen(false);
  }

  return (
    <PreviewShell active="Clientes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">OCTUBRE 2025 · Clic en un cliente para editar su ficha</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <UserPlus className="size-4" />
              Activar cliente existente
            </Button>
            <Button className="glow-primary" onClick={() => setSheetOpen(true)}>
              <Plus className="size-4" />
              Registrar cliente
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((client) => (
            <Link
              key={client.id}
              href={`/preview/clientes/${client.id}`}
              className="group relative block overflow-hidden rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/0 blur-2xl transition-all group-hover:bg-primary/25" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {client.nombre}
                  </h3>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {client.encargado !== SIN_ESTRATEGA && miembroPorNombre.get(client.encargado) && (
                      <MemberAvatar
                        nombre={client.encargado}
                        color={miembroPorNombre.get(client.encargado)?.color}
                        foto={miembroPorNombre.get(client.encargado)?.foto}
                        icono={miembroPorNombre.get(client.encargado)?.icono}
                        className="size-3.5"
                        textClassName="text-[7px]"
                      />
                    )}
                    {client.encargado}
                  </p>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>

              {client.atrasados > 0 && (
                <Badge variant="destructive" className="relative mt-2">
                  {client.atrasados} atrasado(s)
                </Badge>
              )}

              <div className="relative mt-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Meta del mes</span>
                  <span className="font-mono tabular-nums">
                    {client.finalizados} / {client.meta}
                  </span>
                </div>
                <Progress value={client.alcanceMeta} />
              </div>

              <div className="relative mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-mono font-semibold tabular-nums">{client.total}</p>
                  <p className="text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="font-mono font-semibold tabular-nums">{client.enCurso}</p>
                  <p className="text-muted-foreground">En curso</p>
                </div>
                <div>
                  <p className="font-mono font-semibold tabular-nums">{client.finalizados}</p>
                  <p className="text-muted-foreground">Finalizados</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Registrar cliente — brief corto */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Registrar cliente</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleRegistrar} className="flex flex-1 flex-col gap-4 px-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-nombre">Nombre del cliente *</Label>
              <Input id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-meta">Meta de videos del mes *</Label>
                <Input id="p-meta" type="number" min={0} value={meta} onChange={(e) => setMeta(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Estratega</Label>
                <EstrategaSelect value={encargado} onChange={setEncargado} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-notas">Notas rápidas</Label>
              <Textarea id="p-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Brief corto: qué necesita este cliente este mes..." />
            </div>
            <SheetFooter className="mt-auto flex-row justify-end gap-2 px-0">
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </SheetClose>
              <Button type="submit" className="glow-primary">Registrar cliente</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Activar cliente existente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activar cliente de tu cartera</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {inactivos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos tus clientes activos ya están sumados a este mes.
              </p>
            ) : (
              inactivos.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">Meta sugerida: {c.meta}</p>
                  </div>
                  <Button size="sm" onClick={() => handleActivar(c.id)}>Activar</Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PreviewShell>
  );
}
