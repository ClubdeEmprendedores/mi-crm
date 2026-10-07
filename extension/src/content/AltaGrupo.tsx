import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { HistorialEntry, Rubro, SedeOption } from "../../../src/types";
import { RUBRO_LABELS } from "../../../src/types";
import { sanitizeInstagramUsername } from "../../../src/utils/instagram";
import {
  camposFaltantes,
  extraerCondiciones,
  extraerEmail,
  extraerInstagram,
  extraerPlan,
  GRUPO_SEDE_LABELS,
  textoAlta,
  whatsappLocal,
  type DatosAlta,
} from "../../../src/utils/altaEmprendedor";
import { leerMensajesDelChat } from "./chatDom";

export type AltaLead = {
  id: string;
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  instagram: string;
  rubro: Rubro | null;
  sede: SedeOption | null;
  historial: HistorialEntry[];
};

// Sin textos de ejemplo en los campos: en gris parecían datos leídos.
const CAMPOS: Array<{ key: keyof DatosAlta; label: string }> = [
  { key: "nombre", label: "Nombre completo" },
  { key: "emprendimiento", label: "Emprendimiento" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Mail" },
  { key: "instagram", label: "Instagram (sin @)" },
  { key: "rubro", label: "Rubro" },
  { key: "plan", label: "Plan contratado" },
  { key: "montoMensual", label: "Monto por mes" },
  { key: "mesInicio", label: "Comienza en (mes)" },
];

const SEDES: SedeOption[] = ["sanfer", "santelmo", "ambas"];
const SEDE_CORTA: Record<SedeOption, string> = { sanfer: "San Fernando", santelmo: "San Telmo", ambas: "Las dos" };

// El historial del CRM puede estar atrasado (depende de la sincronización
// con WhatsApp), así que se suman los mensajes que se ven en el chat abierto.
function datosIniciales(lead: AltaLead, delChat: HistorialEntry[]): DatosAlta {
  const charla = [...lead.historial, ...delChat];
  return {
    nombre: lead.nombre,
    emprendimiento: lead.empresa,
    whatsapp: whatsappLocal(lead.telefono),
    email: lead.email || extraerEmail(charla),
    instagram: lead.instagram || extraerInstagram(charla),
    rubro: lead.rubro ? RUBRO_LABELS[lead.rubro] : "",
    plan: extraerPlan(charla),
    ...extraerCondiciones(charla),
  };
}

export function AltaGrupo({ lead, onActualizado }: { lead: AltaLead; onActualizado: () => void }) {
  const [datos, setDatos] = useState<DatosAlta | null>(null);
  const [sede, setSede] = useState<SedeOption | "">(lead.sede ?? "");
  const [estado, setEstado] = useState<string | null>(null);
  const [leidosDelChat, setLeidosDelChat] = useState(0);

  const preparar = () => {
    const delChat = leerMensajesDelChat();
    setLeidosDelChat(delChat.length);
    setDatos(datosIniciales(lead, delChat));
    setEstado(null);
  };

  if (!datos) {
    return (
      <button className="mcw-btn mcw-btn-primary" onClick={preparar}>
        🐝 Alta para el grupo
      </button>
    );
  }

  const faltan = camposFaltantes(datos);

  const copiar = async () => {
    if (!sede) return;
    await navigator.clipboard.writeText(textoAlta(datos));
    setEstado("Copiado. Guardando en el CRM…");

    // Pasa a miembro activo en esa sede, completa lo que faltaba en la ficha
    // y deja constancia en el historial de qué se mandó al grupo.
    const resumen = [datos.plan, datos.montoMensual && `${datos.montoMensual}/mes`, datos.mesInicio && `desde ${datos.mesInicio}`]
      .filter(Boolean)
      .join(", ");
    const nota = `🐝 Alta enviada al grupo de ${GRUPO_SEDE_LABELS[sede]}${resumen ? `: ${resumen}` : ""}`;
    const { error } = await supabase
      .from("leads")
      .update({
        etapa: "ganado",
        sede,
        nombre: lead.nombre || datos.nombre,
        empresa: lead.empresa || datos.emprendimiento,
        email: lead.email || datos.email,
        instagram: lead.instagram || sanitizeInstagramUsername(datos.instagram),
        historial: [{ fecha: new Date().toISOString(), nota }, ...lead.historial],
      })
      .eq("id", lead.id);

    setEstado(
      error
        ? `Copiado, pero no se pudo guardar en el CRM (${error.message}). Pegalo igual en el grupo.`
        : `¡Copiado! Pegalo en el grupo de ${GRUPO_SEDE_LABELS[sede]}. Ya quedó como miembro activo en el CRM.`,
    );
    if (!error) onActualizado();
  };

  return (
    <div>
      <div className="mcw-section-title">Alta para el grupo</div>
      {CAMPOS.map((c) => (
        <label key={c.key} className="mcw-alta-campo">
          <span>{c.label}</span>
          <input
            className={`mcw-input ${datos[c.key].trim() ? "" : "mcw-input-vacio"}`}
            value={datos[c.key]}
            onChange={(e) => {
              setDatos({ ...datos, [c.key]: e.target.value });
              setEstado(null);
            }}
          />
        </label>
      ))}
      {/* Botones en vez de <select>: el desplegable nativo de Chrome no toma
          el tema oscuro y las opciones quedaban ilegibles. */}
      <div className="mcw-alta-campo">
        <span>Grupo</span>
        <div className="mcw-row">
          {SEDES.map((s) => (
            <button
              key={s}
              className={`mcw-sede ${sede === s ? "mcw-sede-activa" : ""} ${sede ? "" : "mcw-input-vacio"}`}
              onClick={() => {
                setSede(s);
                setEstado(null);
              }}
            >
              {SEDE_CORTA[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="mcw-empty" style={{ fontSize: 11 }}>
        {leidosDelChat > 0
          ? `Busqué en el historial del CRM y en los ${leidosDelChat} mensajes que se ven en este chat. Si algo está más arriba, subí en el chat y tocá "Volver a buscar".`
          : "No pude leer los mensajes de este chat; busqué solo en el historial del CRM."}
      </div>
      {faltan.length > 0 && <div className="mcw-alerta">No lo encontré: {faltan.join(", ")}. Completalo a mano.</div>}
      <button className="mcw-btn mcw-btn-primary" style={{ marginTop: 6 }} disabled={!sede} onClick={copiar}>
        {sede ? `📋 Copiar para ${GRUPO_SEDE_LABELS[sede]}` : "Elegí la sede para copiar"}
      </button>
      <button className="mcw-btn" style={{ width: "100%", marginTop: 6 }} onClick={preparar}>
        ↻ Volver a buscar en la charla
      </button>
      {estado && <div className="mcw-ok">{estado}</div>}
    </div>
  );
}
