import type { HistorialEntry } from "../types";

/** Combina dos historiales sin duplicar entradas, ordenado del más reciente al más viejo. */
export function mergeHistorial(existing: HistorialEntry[], incoming: HistorialEntry[]): HistorialEntry[] {
  const seen = new Set(existing.map((h) => `${h.fecha}|${h.nota}`));
  const merged = [...existing];
  for (const h of incoming) {
    const key = `${h.fecha}|${h.nota}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(h);
    }
  }
  merged.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  return merged;
}
