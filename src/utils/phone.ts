/** Clave canónica de un teléfono: últimos 10 dígitos (ignora prefijos como el "9" de Argentina). */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** Compara dos teléfonos ignorando formato y prefijos (ej. el "9" de Argentina). */
export function phonesMatch(a: string, b: string): boolean {
  const ka = phoneKey(a);
  const kb = phoneKey(b);
  return !!ka && !!kb && ka === kb;
}
