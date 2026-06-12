import type { Lead } from "../types";

interface WhatsAppLeadEntry {
  nombre?: string;
  telefono?: string;
  notas?: string;
}

export function parseWhatsAppExport(jsonText: string): Partial<Lead>[] {
  try {
    const data = JSON.parse(jsonText) as WhatsAppLeadEntry[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((d) => d.telefono)
      .map((d) => ({
        nombre: d.nombre ?? "",
        telefono: d.telefono ?? "",
        notas: d.notas ?? "",
      }));
  } catch {
    return [];
  }
}
