// JS no tiene forma nativa de construir un Date a partir de componentes de
// hora local en una zona horaria arbitraria (solo al revés, con Intl). Este
// truco calcula el offset real de esa zona en el instante dado (soporta
// horario de verano) comparando cómo se renderiza el mismo instante en esa
// zona vs. en UTC, y ajusta con la diferencia — sin depender de una
// librería de timezones.
function tzOffsetMs(date: Date, timeZone: string): number {
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return tzDate.getTime() - utcDate.getTime();
}

/** Componentes de hora local (año/mes/día/hora/minuto) de un ISO en una zona horaria dada. */
export function zonedDateParts(
  iso: string,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0; // algunos locales devuelven "24" para medianoche
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
  };
}

/** Convierte componentes de hora local en una zona horaria a un ISO en UTC. */
export function zonedTimeToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(new Date(naiveUtcMs), timeZone);
  return new Date(naiveUtcMs - offset).toISOString();
}
