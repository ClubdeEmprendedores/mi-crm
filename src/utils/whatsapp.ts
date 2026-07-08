import type { HistorialEntry } from "../types";
import { getEstadoConversacion, type EstadoConversacion } from "./conversacion";
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
  return `${saludo} Soy de Club de Emprendedores. Hace un tiempo hablamos y nos contaste que San Fernando te quedaba lejos. ¡Tenemos novedades! Abrimos un nuevo espacio en San Telmo, mucho más cerca de Capital. ¿Te gustaría que te cuente más?`;
}

export const RECONTACTO_TIBIO_TAG = "📣 Recontacto 25-jun: tibio";
export const RECONTACTO_FRIO_TAG = "📣 Recontacto 25-jun: frio";

export function recontactoTibioMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} Soy Mati, de Club de Emprendedores. Hace un tiempo hablamos y no llegamos a cerrarlo. ¿Seguís con tu emprendimiento? Tenemos lugar en San Fernando y en San Telmo, contame y vemos qué te conviene.`;
}

export function recontactoFrioMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} Soy Mati, de Club de Emprendedores. Vi que en algún momento te interesaste por tener tu espacio con nosotros. Somos un showroom compartido en San Fernando y San Telmo: vos creás, nosotros vendemos, cobramos y reponemos. ¿Seguís emprendiendo? Te cuento más si querés.`;
}

/** Presentación estándar del Club, usada como apertura en los mensajes de primer contacto. */
const INTRO_CLUB = "Soy Mati, del Club de Emprendedores. Tenemos sede en San Fernando y en San Telmo.";

export function defaultReconexionMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ${INTRO_CLUB} ¿Cómo va tu emprendimiento? Te cuento cómo podés tener tu espacio en nuestro showroom.`;
}

/** Nunca se lo contactó: primer mensaje de apertura. */
export function mensajePrimerContacto(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ${INTRO_CLUB} Contame: ¿qué vendés? ¿Tenés Instagram para conocer un poco tu marca?`;
}

/** Ya se le escribió y no respondió: mensaje de recontacto liviano. */
export function mensajeSinRespuestaDeEllos(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} ${INTRO_CLUB} Te escribí hace un tiempo y no sé si llegaste a ver el mensaje. ¿Seguís con tu emprendimiento? Contame y te cuento cómo tener tu espacio con nosotros.`;
}

/** Último mensaje fue de ellos: retomar la conversación que quedó pendiente. */
export function mensajeEsperandoTuRespuesta(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} Perdón la demora en responder. Seguimos la conversación: ¿en qué habíamos quedado?`;
}

/** Elige la plantilla según el sub-estado de la conversación (no la etapa del Kanban). */
export function mensajePorEstadoConversacion(nombre: string, estado: EstadoConversacion): string {
  switch (estado) {
    case "nunca":
      return mensajePrimerContacto(nombre);
    case "sin_respuesta_de_ellos":
      return mensajeSinRespuestaDeEllos(nombre);
    case "esperando_tu_respuesta":
      return mensajeEsperandoTuRespuesta(nombre);
    default:
      return defaultReconexionMensaje(nombre);
  }
}

type ReconexionLead = {
  nombre: string;
  tags: string[];
  historial?: HistorialEntry[];
  ultimoMensajeEn?: string;
};

/**
 * Elige el mensaje de reconexión: tag de campaña específica (San Telmo > tibio > frío)
 * si existe, si no según el sub-estado real de la conversación (nunca contactado /
 * no respondió / quedó esperando tu respuesta), y como último recurso el genérico.
 */
export function mensajeReconexion(lead: ReconexionLead): string {
  if (lead.tags.includes(SAN_TELMO_TAG)) return sanTelmoReconexionMensaje(lead.nombre);
  if (lead.tags.includes(RECONTACTO_TIBIO_TAG)) return recontactoTibioMensaje(lead.nombre);
  if (lead.tags.includes(RECONTACTO_FRIO_TAG)) return recontactoFrioMensaje(lead.nombre);
  const estado = getEstadoConversacion({
    historial: lead.historial ?? [],
    ultimoMensajeEn: lead.ultimoMensajeEn,
  });
  if (estado !== "revisar") return mensajePorEstadoConversacion(lead.nombre, estado);
  return defaultReconexionMensaje(lead.nombre);
}

export function reporteEnviadoMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `Hola ${primerNombre},` : "Hola,";
  return `${saludo} te enviamos por mail el reporte de ventas. Acá estoy por cualquier comentario o duda. ¡Gracias!`;
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || "";
}

/** Reemplaza {nombre} en una plantilla de mensaje por el primer nombre del lead. */
export function aplicarPlantilla(plantilla: string, nombre: string): string {
  return plantilla.replace(/\{nombre\}/gi, primerNombre(nombre));
}
