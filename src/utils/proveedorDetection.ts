import type { HistorialEntry } from "../types";

// Señales de lenguaje de proveedor (venden insumos/servicios AL club) o de staff/logística
// interna, en vez de alguien queriendo vender su propio producto en el showroom.
// Ver feedback_leads_data_quality: en cada importación masiva de WhatsApp aparece un
// porcentaje importante de contactos que no son leads reales.
const PROVEEDOR_KEYWORDS = [
  "cotiz", "presupuesto", "factura a", "factura tipo", "mayorista",
  "impresion", "imprenta", "banner", "folleteria", "folletos", "tarjetas personales",
  "análisis antisiniestral", "analisis antisiniestral", "matafuego", "extintor",
  "difusor", "aromatizacion", "aromatización",
  "turno de caja", "rendicion de caja", "rendición de caja", "arqueo",
  "alquiler del local", "cuota sindical",
] as const;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * True si el texto (notas + historial) tiene lenguaje típico de un proveedor del club
 * o de logística interna de staff, en vez de alguien ofreciendo su propio emprendimiento.
 * Es una heurística para marcar "revisar" en el import, no reemplaza la lectura manual.
 */
export function pareceProveedorOStaff(notas: string, historial: HistorialEntry[]): boolean {
  const texto = normalize(
    [notas, ...historial.map((h) => h.nota)].join(" "),
  );
  return PROVEEDOR_KEYWORDS.some((kw) => texto.includes(normalize(kw)));
}
