import type { HistorialEntry } from "../../../src/types";

// Lee los mensajes del chat abierto tal como están en pantalla. Es solo
// lectura del DOM (no navega ni dispara nada en WhatsApp Web): sirve para
// tener la charla de hoy aunque el historial del CRM no esté sincronizado.
//
// Cada burbuja tiene un `.copyable-text` con `data-pre-plain-text` del estilo
// "[16:18, 7/10/2026] Laura: ", y la burbuja enviada por nosotros está dentro
// de un `.message-out`.

const PRE_RE = /^\[(\d{1,2}):(\d{2})[^,]*,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]/;

function fechaDe(pre: string, fallback: Date): string {
  const m = pre.match(PRE_RE);
  if (!m) return fallback.toISOString();
  const [, hh, mm, d, mo, y] = m;
  const anio = y.length === 2 ? 2000 + Number(y) : Number(y);
  const fecha = new Date(anio, Number(mo) - 1, Number(d), Number(hh), Number(mm));
  return isNaN(fecha.getTime()) ? fallback.toISOString() : fecha.toISOString();
}

export function leerMensajesDelChat(): HistorialEntry[] {
  const main = document.querySelector('div[id="main"]');
  if (!main) return [];
  const burbujas = main.querySelectorAll<HTMLElement>(".copyable-text[data-pre-plain-text]");
  const ahora = Date.now();
  const mensajes: HistorialEntry[] = [];
  burbujas.forEach((el, i) => {
    const pre = el.getAttribute("data-pre-plain-text") ?? "";
    const texto = (el.querySelector<HTMLElement>(".selectable-text")?.innerText ?? el.innerText).trim();
    if (!texto) return;
    const esMio = !!el.closest(".message-out");
    // Si no se puede leer la fecha, se respeta el orden en pantalla.
    const fallback = new Date(ahora - (burbujas.length - i) * 1000);
    mensajes.push({ fecha: fechaDe(pre, fallback), nota: `📲 ${esMio ? "Yo" : "Ellos"}: ${texto}` });
  });
  return mensajes;
}
