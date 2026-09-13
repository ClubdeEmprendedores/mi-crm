/** Ultimos 10 digitos de un telefono — mismo criterio que push_historial_to_crm.mjs. */
export function last10(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Extrae el telefono visible en el texto del header de un chat de WhatsApp Web.
 * Solo funciona cuando el contacto NO esta guardado con nombre (WA muestra el
 * numero crudo tipo "+54 9 11 2717-4084" en ese caso). Ver extension/NOTES.md.
 */
export function extractPhoneFromHeaderText(headerText: string): string | null {
  const m = headerText.match(/\+\d[\d\s-]{8,}\d/);
  return m ? m[0] : null;
}
