// Sonidos de Monitoreo, sintetizados con Web Audio API en vez de cargar un
// archivo — no hay nada que bloquee la reproducción (se disparan desde una
// acción del usuario o un chequeo que corre en la pestaña activa, así que
// las políticas de autoplay no aplican).

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return AudioCtx ? new AudioCtx() : null;
}

// Arpegio ascendente tipo "ganaste" para cuando un video llega al 100%.
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notas = [523.25, 659.25, 783.99, 1046.5]; // Do5 Mi5 Sol5 Do6

    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const inicio = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, inicio);
      gain.gain.linearRampToValueAtTime(0.22, inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.32);
    });

    setTimeout(() => ctx.close(), 900);
  } catch {
    // Sin soporte de audio en el navegador — no bloquea el resto del flujo.
  }
}

// Dos bips graves y cortos, tono de alarma — para cuando un video se
// estanca en edición y hay que avisar en rojo, ya (no arrancó a tiempo, o
// lleva demasiado con un % bajo).
export function playAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const pulsos = [0, 0.22];

    pulsos.forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 415.3; // Sol#4 — tono de alerta, no alegre

      const inicio = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, inicio);
      gain.gain.linearRampToValueAtTime(0.2, inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.2);
    });

    setTimeout(() => ctx.close(), 700);
  } catch {
    // Sin soporte de audio en el navegador — no bloquea el resto del flujo.
  }
}
