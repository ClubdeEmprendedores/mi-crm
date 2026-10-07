import type { HistorialEntry, SedeOption } from "../types";
import { parseSpeaker, stripSpeakerPrefix } from "./conversacion";
import { sanitizeInstagramUsername } from "./instagram";

// Datos que se pegan en el grupo de cada sede para que den de alta al
// emprendedor en la solapa "Emprendedores". Lo que no se encuentra en la
// conversación queda vacío y se completa a mano antes de copiar.
export type DatosAlta = {
  nombre: string;
  emprendimiento: string;
  whatsapp: string;
  email: string;
  instagram: string;
  rubro: string;
  plan: string;
  montoMensual: string;
  mesInicio: string;
};

export const GRUPO_SEDE_LABELS: Record<SedeOption, string> = {
  sanfer: "San Fernando",
  santelmo: "San Telmo",
  ambas: "San Fernando y San Telmo",
};

const MAILS_PROPIOS = /cde|clubdeemprendedores/i;
const RUTAS_NO_PERFIL = new Set(["p", "reel", "reels", "stories", "explore", "tv", "invites", "share"]);
// El plan se busca solo en la charla del cierre, no en consultas de meses atrás.
const VENTANA_PLAN_DIAS = 45;

function mensajesNuevosPrimero(historial: HistorialEntry[]): HistorialEntry[] {
  return [...historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/** Último mail que mandó el emprendedor (ignora los mails del Club). */
export function extraerEmail(historial: HistorialEntry[]): string {
  for (const h of mensajesNuevosPrimero(historial)) {
    if (parseSpeaker(h.nota) === "yo") continue;
    const matches = h.nota.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
    const propio = matches.find((m) => !MAILS_PROPIOS.test(m));
    if (propio) return propio.toLowerCase();
  }
  return "";
}

/** Último Instagram que pasó el emprendedor (link o @usuario). */
export function extraerInstagram(historial: HistorialEntry[]): string {
  for (const h of mensajesNuevosPrimero(historial)) {
    if (parseSpeaker(h.nota) === "yo") continue;
    const texto = stripSpeakerPrefix(h.nota);
    const link = texto.match(/instagram\.com\/[a-zA-Z0-9._]+/i);
    if (link) {
      const user = sanitizeInstagramUsername(link[0]);
      // instagram.com/p/…, /reel/… son publicaciones, no el perfil.
      if (user && !RUTAS_NO_PERFIL.has(user.toLowerCase())) return user;
    }
    const arroba = texto.match(/(?:^|\s)@([a-zA-Z0-9._]{3,30})/);
    if (arroba && !arroba[1].includes("@")) {
      const user = sanitizeInstagramUsername(arroba[1]);
      if (user && !/\.(com|ar)$/i.test(user)) return user;
    }
  }
  return "";
}

/**
 * Mes y abono del mensaje "Estos son los próximos pasos…", que trae
 * "el abono de OCTUBRE *$150.000*".
 */
export function extraerCondiciones(historial: HistorialEntry[]): { mesInicio: string; montoMensual: string } {
  for (const h of mensajesNuevosPrimero(historial)) {
    if (parseSpeaker(h.nota) !== "yo") continue;
    const m = h.nota.match(/abono de ([A-Za-zÁÉÍÓÚáéíóúñÑ ]+?)\s*\*\s*\$\s*([\d.,]+)\s*\*/);
    if (m) {
      const mes = m[1].replace(/^medio\s+/i, "").trim().toUpperCase();
      return { mesInicio: mes, montoMensual: `$${m[2]}` };
    }
  }
  return { mesInicio: "", montoMensual: "" };
}

const PLANES_CLUB = /\b(colmena|panal|polen|vuelo|n[ée]ctar)\b/i;
const MOBILIARIO = /\b(un|una|dos|tres|cuatro|\d+)?\s*(percheros?|estantes?|m[oó]dulos?|paneles?|panel)\b/gi;

/** Lo último que se habló de mobiliario (perchero, estante, módulo) y plan. */
export function extraerPlan(historial: HistorialEntry[]): string {
  const ordenados = mensajesNuevosPrimero(historial);
  if (ordenados.length === 0) return "";
  const desde = new Date(ordenados[0].fecha).getTime() - VENTANA_PLAN_DIAS * 24 * 60 * 60 * 1000;
  for (const h of ordenados) {
    if (new Date(h.fecha).getTime() < desde) break;
    const texto = stripSpeakerPrefix(h.nota);
    // Los mensajes largos son las presentaciones genéricas del Club,
    // que nombran todos los formatos y no dicen qué se contrató.
    if (texto.length > 400) continue;
    const matches = [...texto.matchAll(MOBILIARIO)];
    if (matches.length === 0) continue;
    // Un ítem por tipo de mueble ("estante" y "4 estantes" cuentan una vez).
    const porTipo = new Map<string, string>();
    for (const m of matches) {
      const palabra = m[2].toLowerCase();
      const tipo = palabra.startsWith("perch") ? "perchero" : palabra.startsWith("estant") ? "estante" : palabra.startsWith("pan") ? "panel" : "modulo";
      if (!porTipo.has(tipo)) porTipo.set(tipo, m[0].trim().toLowerCase());
    }
    const unicos = [...porTipo.values()];
    const plan = texto.match(PLANES_CLUB);
    const base = unicos.join(" y ");
    return plan ? `Plan ${plan[1][0].toUpperCase()}${plan[1].slice(1).toLowerCase()} (${base})` : base;
  }
  return "";
}

/** "5491141907630" → "1141907630" (como se carga en la planilla). */
export function whatsappLocal(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  if (digits.startsWith("549") && digits.length === 13) return digits.slice(3);
  if (digits.startsWith("54") && digits.length === 12) return digits.slice(2);
  return digits;
}

export function textoAlta(d: DatosAlta): string {
  const instagram = d.instagram ? `@${d.instagram.replace(/^@+/, "")}` : "";
  const lineas = [
    `- Nombre completo: ${d.nombre}`,
    `- Nombre del emprendimiento: ${d.emprendimiento}`,
    `- WhatsApp: ${d.whatsapp}`,
    `- Correo electrónico: ${d.email}`,
    `- Instagram del emprendimiento: ${instagram}`,
    `- Rubro: ${d.rubro}`,
    `- Plan contratado: ${d.plan}`,
  ];
  const condiciones =
    d.montoMensual || d.mesInicio
      ? `\n\nEl plan es ${d.montoMensual || "$___"} por mes, comienza en ${d.mesInicio || "___"}`
      : "";
  return lineas.join("\n") + condiciones;
}

export function camposFaltantes(d: DatosAlta): string[] {
  const nombres: Record<keyof DatosAlta, string> = {
    nombre: "nombre",
    emprendimiento: "emprendimiento",
    whatsapp: "WhatsApp",
    email: "mail",
    instagram: "Instagram",
    rubro: "rubro",
    plan: "plan",
    montoMensual: "monto",
    mesInicio: "mes de inicio",
  };
  return (Object.keys(nombres) as Array<keyof DatosAlta>).filter((k) => !d[k].trim()).map((k) => nombres[k]);
}
