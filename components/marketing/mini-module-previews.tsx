// Mini-vistas REALES de cada módulo — mismos nombres, estados y datos que
// aparecen en el resto del Home (vitrinas grandes), a escala reducida. Nada
// de íconos abstractos: son fragmentos reconstruidos de la interfaz real.

const FILAS_MONITOREO = [
  { cliente: "Caicedo", estado: "Aprobado", dot: "bg-success" },
  { cliente: "Cantaso Studio", estado: "Edición", dot: "bg-info" },
  { cliente: "Informativo Burrito", estado: "Revisión", dot: "bg-warning" },
];

export function MiniMonitoreo() {
  return (
    <div className="space-y-1.5">
      {FILAS_MONITOREO.map((f, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 rounded-md bg-background/50 px-2.5 py-1.5"
        >
          <span className="truncate text-[10px] font-medium">{f.cliente}</span>
          <span className="flex shrink-0 items-center gap-1 text-[9px] text-muted-foreground">
            <span className={`size-1.5 rounded-full ${f.dot}`} />
            {f.estado}
          </span>
        </div>
      ))}
    </div>
  );
}

const EVENTOS_MINI = new Map([
  [3, { label: "Cantaso", color: "bg-info/30 text-info ring-1 ring-info/50" }],
  [10, { label: "Caicedo", color: "bg-violet/30 text-violet ring-1 ring-violet/50" }],
]);

export function MiniCalendario() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 14 }, (_, i) => i + 1).map((dia) => {
        const ev = EVENTOS_MINI.get(dia);
        return (
          <div
            key={dia}
            className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded p-1 pt-1 ${
              ev ? "bg-primary/15 ring-1 ring-primary/40" : "bg-background/50"
            }`}
          >
            <span className="text-[8px] text-muted-foreground">{dia}</span>
            {ev && <span className={`w-full truncate rounded text-center text-[6px] leading-tight ${ev.color}`}>{ev.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

const CLIENTES_MINI = [
  { nombre: "Caicedo", color: "#06B6D4", pct: 75 },
  { nombre: "Cantaso Studio", color: "#F59E0B", pct: 40 },
];

export function MiniClientes() {
  return (
    <div className="space-y-2.5">
      {CLIENTES_MINI.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-white ring-1 ring-white/10"
            style={{ backgroundColor: c.color }}
          >
            {c.nombre.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium">{c.nombre}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const PUNTOS_METRICAS = [30, 55, 40, 70, 58, 85, 78, 96];

export function MiniMetricas() {
  const w = 100;
  const h = 30;
  const step = w / (PUNTOS_METRICAS.length - 1);
  const puntos = PUNTOS_METRICAS.map((p, i) => `${i * step},${h - (p / 100) * h}`).join(" ");
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-muted-foreground">Cumplimiento</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-success">+22%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1 h-8 w-full">
        <defs>
          <linearGradient id="mini-metricas-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        <polyline
          points={puntos}
          fill="none"
          stroke="url(#mini-metricas-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
