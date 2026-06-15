import type { HistorialEntry, Lead } from "../types";

interface WhatsAppHistorialEntry {
  nombre?: string;
  telefono?: string;
  historial?: HistorialEntry[];
}

export function parseWhatsAppHistorial(jsonText: string): Partial<Lead>[] {
  try {
    const data = JSON.parse(jsonText) as WhatsAppHistorialEntry[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((d) => d.telefono && Array.isArray(d.historial) && d.historial.length > 0)
      .map((d) => ({
        nombre: d.nombre ?? "",
        telefono: d.telefono ?? "",
        historial: d.historial ?? [],
      }));
  } catch {
    return [];
  }
}
