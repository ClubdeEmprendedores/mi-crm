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

const CAMPOS: Array<{ key: keyof DatosAlta; label: string; placeholder?: string }> = [
  { key: "nombre", label: "Nombre completo" },
  { key: "emprendimiento", label: "Emprendimiento" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Mail" },
  { key: "instagram", label: "Instagram", placeholder: "sin @" },
  { key: "rubro", label: "Rubro", placeholder: "indumentaria y accesorios" },
  { key: "plan", label: "Plan", placeholder: "perchero y estante" },
  { key: "montoMensual", label: "Monto por mes", placeholder: "$140.000" },
  { key: "mesInicio", label: "Comienza en", placeholder: "OCTUBRE" },
];

const SEDES: SedeOption[] = ["sanfer", "santelmo", "ambas"];

function datosIniciales(lead: AltaLead): DatosAlta {
  return {
    nombre: lead.nombre,
    emprendimiento: lead.empresa,
    whatsapp: whatsappLocal(lead.telefono),
    email: lead.email || extraerEmail(lead.historial),
    instagram: lead.instagram || extraerInstagram(lead.historial),
    rubro: lead.rubro ? RUBRO_LABELS[lead.rubro] : "",
    plan: extraerPlan(lead.historial),
    ...extraerCondiciones(lead.historial),
  };
}

export function AltaGrupo({ lead, onActualizado }: { lead: AltaLead; onActualizado: () => void }) {
  const [datos, setDatos] = useState<DatosAlta | null>(null);
  const [sede, setSede] = useState<SedeOption | "">(lead.sede ?? "");
  const [estado, setEstado] = useState<string | null>(null);

  if (!datos) {
    return (
      <button className="mcw-btn mcw-btn-primary" onClick={() => setDatos(datosIniciales(lead))}>
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
            placeholder={c.placeholder}
            onChange={(e) => {
              setDatos({ ...datos, [c.key]: e.target.value });
              setEstado(null);
            }}
          />
        </label>
      ))}
      <label className="mcw-alta-campo">
        <span>Grupo</span>
        <select
          className={`mcw-input ${sede ? "" : "mcw-input-vacio"}`}
          value={sede}
          onChange={(e) => setSede(e.target.value as SedeOption | "")}
        >
          <option value="">Elegí la sede…</option>
          {SEDES.map((s) => (
            <option key={s} value={s}>
              {GRUPO_SEDE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {faltan.length > 0 && <div className="mcw-alerta">No lo encontré en la charla: {faltan.join(", ")}.</div>}
      <button className="mcw-btn mcw-btn-primary" style={{ marginTop: 6 }} disabled={!sede} onClick={copiar}>
        {sede ? `📋 Copiar para ${GRUPO_SEDE_LABELS[sede]}` : "Elegí la sede para copiar"}
      </button>
      <button className="mcw-btn" style={{ width: "100%", marginTop: 6 }} onClick={() => setDatos(datosIniciales(lead))}>
        ↻ Volver a buscar en la charla
      </button>
      {estado && <div className="mcw-ok">{estado}</div>}
    </div>
  );
}
