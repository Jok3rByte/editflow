// Psicología del color aplicada al % de avance: rojo (urgencia/bajo %) pasa
// por amarillo en 50% hasta verde (calma/alto %) — un degradado continuo en
// vez de categorías discretas, para que el cambio de tono se sienta
// gradual. El mismo criterio que ya se usa en /preview/monitoreo.

export function huePorProgreso(progreso: number): number {
  const p = Math.max(0, Math.min(100, progreso));
  return (p / 100) * 120;
}

export function colorPorProgreso(progreso: number): string {
  const p = Math.max(0, Math.min(100, progreso));
  // La saturación sube y la luz baja un poco cerca del 100% — así el verde
  // final se ve fuerte y vivo, no un pastel igual de apagado que el resto.
  const saturacion = 65 + (p / 100) * 25;
  const luminosidad = 48 - (p / 100) * 8;
  return `hsl(${huePorProgreso(p)}, ${saturacion}%, ${luminosidad}%)`;
}

// Degradado de dos tonos centrado en el % actual: el extremo derecho (el
// borde de avance) siempre es el color exacto del %, dándole textura a la
// barra sin perder la lectura inmediata.
export function gradientePorProgreso(progreso: number): string {
  const inicio = colorPorProgreso(Math.max(0, progreso - 20));
  const fin = colorPorProgreso(progreso);
  return `linear-gradient(90deg, ${inicio}, ${fin})`;
}
