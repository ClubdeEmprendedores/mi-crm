import { SAN_TELMO_TAG } from "./reconexionCampaign";

export function whatsappUrl(telefono: string, mensaje?: string): string {
  const digits = telefono.replace(/\D/g, "");
  return mensaje
    ? `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/${digits}`;
}

export function sanTelmoReconexionMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ✋ Soy de Club de Emprendedores. Hace un tiempo hablamos y nos contaste que San Fernando te quedaba lejos. ¡Tenemos novedades! ✨ Abrimos un nuevo espacio en San Telmo, mucho más cerca de Capital. ¿Te gustaría que te cuente más?`;
}

export const RECONTACTO_TIBIO_TAG = "📣 Recontacto 25-jun: tibio";
export const RECONTACTO_FRIO_TAG = "📣 Recontacto 25-jun: frio";

export function recontactoTibioMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ✋ Soy Mati, de Club de Emprendedores. Hace un tiempo hablamos y no llegamos a cerrarlo. ¿Seguís con tu emprendimiento? Tenemos lugar en San Fernando y en San Telmo, contame y vemos qué te conviene ✨`;
}

export function recontactoFrioMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ✋ Soy Mati, de Club de Emprendedores. Vi que en algún momento te interesaste por tener tu espacio con nosotros. Somos un showroom compartido en San Fernando y San Telmo: vos creás, nosotros vendemos, cobramos y reponemos. ¿Seguís emprendiendo? Te cuento más si querés ✨`;
}

export function defaultReconexionMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ✋ Soy Mati, de Club de Emprendedores. ¿Cómo va tu emprendimiento? Te cuento cómo podés tener tu espacio en nuestro showroom ✨`;
}

/** Elige el mensaje de reconexión según los tags del lead: San Telmo > tibio > frío > genérico. */
export function mensajeReconexion(lead: { nombre: string; tags: string[] }): string {
  if (lead.tags.includes(SAN_TELMO_TAG)) return sanTelmoReconexionMensaje(lead.nombre);
  if (lead.tags.includes(RECONTACTO_TIBIO_TAG)) return recontactoTibioMensaje(lead.nombre);
  if (lead.tags.includes(RECONTACTO_FRIO_TAG)) return recontactoFrioMensaje(lead.nombre);
  return defaultReconexionMensaje(lead.nombre);
}
