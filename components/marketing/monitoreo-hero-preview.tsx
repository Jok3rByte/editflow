"use client";

import { useEffect, useState } from "react";

type Estado = "aprobado" | "revision" | "edicion" | "pendiente";

interface FilaVideo {
  cliente: string;
  video: string;
  encargado: string;
  color: string;
  estado: Estado;
}

const ESTADOS: Record<Estado, { label: string; dot: string }> = {
  aprobado: { label: "Aprobado", dot: "bg-success shadow-[0_0_8px_var(--success)]" },
  revision: { label: "En revisión", dot: "bg-warning shadow-[0_0_8px_var(--warning)]" },
  edicion: { label: "Edición", dot: "bg-info shadow-[0_0_8px_var(--info)]" },
  pendiente: { label: "Pendiente", dot: "bg-muted-foreground" },
};

const FILAS: FilaVideo[] = [
  { cliente: "Caicedo", video: "Reel Campus Caicedo", encargado: "Zax", color: "#06B6D4", estado: "aprobado" },
  { cliente: "Cantaso Studio", video: "Comercial Chivo Loco", encargado: "Lian", color: "#F59E0B", estado: "revision" },
  { cliente: "Caicedo", video: "Acueducto banco y mar", encargado: "Diego", color: "#10B981", estado: "edicion" },
  { cliente: "Editor Pro", video: "Reel pack editor pro", encargado: "Zax", color: "#06B6D4", estado: "aprobado" },
  { cliente: "Informativo Burrito", video: "Reel 1", encargado: "—", color: "#6B7280", estado: "pendiente" },
  { cliente: "Informativo Burrito", video: "Reel 2", encargado: "—", color: "#6B7280", estado: "pendiente" },
  { cliente: "Cantaso Studio", video: "Teaser lanzamiento", encargado: "Diego", color: "#10B981", estado: "edicion" },
];

// Solo el contenido de adentro (barra de URL + tabla), sin el marco propio
// ni el glow — así se puede reusar dentro de otra vitrina que ya trae su
// propio marco (ver HeroLiveShowcase), sin anidar dos "ventanas".
export function MonitoreoTableContent({ showUrlBar = true }: { showUrlBar?: boolean }) {
  const [activeRow, setActiveRow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveRow((r) => (r + 1) % FILAS.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {showUrlBar && (
        <div className="flex items-center gap-1.5 border-b border-border/50 px-5 py-3">
          <span className="size-2.5 rounded-full bg-danger/60" />
          <span className="size-2.5 rounded-full bg-warning/60" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 flex-1 truncate rounded-full bg-muted/40 px-3 py-1.5 font-mono text-xs text-muted-foreground">
            app.editflow.io/monitoreo
          </span>
        </div>
      )}

      <div className="grid grid-cols-[2.5rem_1fr_1.6fr_1fr_1fr] gap-3 border-b border-border/50 px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-muted-foreground">
        <span>#</span>
        <span>Cliente</span>
        <span>Video</span>
        <span>Encargado</span>
        <span>Estado</span>
      </div>

      {FILAS.map((fila, i) => (
        <div
          key={i}
          className={`grid grid-cols-[2.5rem_1fr_1.6fr_1fr_1fr] items-center gap-3 border-b border-border/40 px-5 py-4 text-sm transition-colors last:border-b-0 ${
            i === activeRow ? "bg-primary/5" : ""
          }`}
        >
          <span className="font-mono text-muted-foreground">{i + 1}</span>
          <span className="truncate font-medium">{fila.cliente}</span>
          <span className="truncate text-muted-foreground">{fila.video}</span>
          <span className="flex min-w-0 items-center gap-2 truncate">
            {fila.encargado !== "—" && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: fila.color }}
              >
                {fila.encargado.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="truncate">{fila.encargado}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${ESTADOS[fila.estado].dot}`} />
            {ESTADOS[fila.estado].label}
          </span>
        </div>
      ))}
    </>
  );
}

// Mockup animado y en loop de la interfaz de Monitoreo, tal como funciona
// en la app real — no una captura de pantalla ni un GIF (no hay forma de
// grabar la app en este entorno), sino DOM + CSS reconstruyendo la misma
// tabla, mostrado como una vitrina grande y legible del producto real.
export function MonitoreoHeroPreview() {
  return (
    <div className="pointer-events-none mx-auto w-full animate-float">
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-2xl">
        <MonitoreoTableContent />
      </div>
    </div>
  );
}
