import type { Lead } from "../types";

export type EstadoConversacion =
  | "nunca"
  | "esperando_tu_respuesta"
  | "sin_respuesta_de_ellos"
  | "revisar";

export const ESTADOS_CONVERSACION: EstadoConversacion[] = [
  "nunca",
  "esperando_tu_respuesta",
  "sin_respuesta_de_ellos",
  "revisar",
];

export const ESTADO_CONVERSACION_LABELS: Record<EstadoConversacion, string> = {
  nunca: "🆕 Nunca contactado",
  esperando_tu_respuesta: "🟡 Esperando tu respuesta",
  sin_respuesta_de_ellos: "🔴 No respondió",
  revisar: "💬 Revisar conversación",
};

export const ESTADO_CONVERSACION_COLORS: Record<EstadoConversacion, string> = {
  nunca: "#8b95a5",
  esperando_tu_respuesta: "#FFB300",
  sin_respuesta_de_ellos: "#f87171",
  revisar: "#60a5fa",
};

type Speaker = "yo" | "ellos" | null;

const SPEAKER_RE = /^\s*(?:📲\s*)?(yo|ellos)\s*:\s*/i;

/** Detecta quién mandó una entrada de historial a partir de su prefijo ("📲 Yo:" / "Ellos:"). */
export function parseSpeaker(nota: string): Speaker {
  const m = nota.match(SPEAKER_RE);
  if (!m) return null;
  return m[1].toLowerCase() === "yo" ? "yo" : "ellos";
}

/** Le saca el prefijo de hablante a una nota, para mostrarla como preview. */
export function stripSpeakerPrefix(nota: string): string {
  return nota.replace(SPEAKER_RE, "").trim();
}

export type UltimoContacto = {
  fecha: string;
  quien: Speaker;
  texto: string;
};

/**
 * Último punto de contacto real con el lead: la entrada más reciente del historial,
 * o si es más nueva, la fecha en que se le mandó un WhatsApp desde el CRM
 * (ultimoMensajeEn), que siempre es "yo". No asume que el historial venga ordenado.
 */
export function getUltimoContacto(
  lead: Pick<Lead, "historial" | "ultimoMensajeEn">,
): UltimoContacto | null {
  let last: UltimoContacto | null = null;
  for (const entry of lead.historial) {
    if (!entry.fecha) continue;
    if (!last || new Date(entry.fecha).getTime() > new Date(last.fecha).getTime()) {
      last = { fecha: entry.fecha, quien: parseSpeaker(entry.nota), texto: stripSpeakerPrefix(entry.nota) };
    }
  }
  if (
    lead.ultimoMensajeEn &&
    (!last || new Date(lead.ultimoMensajeEn).getTime() > new Date(last.fecha).getTime())
  ) {
    last = { fecha: lead.ultimoMensajeEn, quien: "yo", texto: "" };
  }
  return last;
}

/** Fecha del último contacto real (historial o WhatsApp marcado), sea cual sea más reciente. */
export function getEffectiveUltimoMensaje(
  lead: Pick<Lead, "historial" | "ultimoMensajeEn">,
): string | undefined {
  return getUltimoContacto(lead)?.fecha;
}

/** Sub-estado de la conversación, independiente de la etapa del Kanban. */
export function getEstadoConversacion(
  lead: Pick<Lead, "historial" | "ultimoMensajeEn">,
): EstadoConversacion {
  const ultimo = getUltimoContacto(lead);
  if (!ultimo) return "nunca";
  if (ultimo.quien === "ellos") return "esperando_tu_respuesta";
  if (ultimo.quien === "yo") return "sin_respuesta_de_ellos";
  return "revisar";
}

export function countPorEstado(leads: Lead[], estados: EstadoConversacion[]): number {
  const set = new Set(estados);
  return leads.filter((l) => set.has(getEstadoConversacion(l))).length;
}

/** Leads en "nuevo" que ya tienen historial: técnicamente ya se inició la conversación. */
export function leadsParaRecalcular(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.etapa === "nuevo" && l.historial.length > 0);
}
