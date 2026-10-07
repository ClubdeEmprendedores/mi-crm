import { useState } from "react";
import type { HistorialEntry, Rubro, SedeOption } from "../types";
import { RUBRO_LABELS, SEDE_LABELS } from "../types";
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
} from "../utils/altaEmprendedor";

type Props = {
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  instagram: string;
  rubro: Rubro | "";
  sede: SedeOption | "";
  historial: HistorialEntry[];
  onSedeChange: (sede: SedeOption | "") => void;
  /** Completa en la ficha los datos que faltaban y deja registro del alta en el historial. */
  onAltaCopiada: (datos: DatosAlta, sede: SedeOption) => void;
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

export function AltaGrupoBox(props: Props) {
  const [datos, setDatos] = useState<DatosAlta | null>(null);
  const [copiado, setCopiado] = useState(false);

  const preparar = () => {
    const condiciones = extraerCondiciones(props.historial);
    setDatos({
      nombre: props.nombre,
      emprendimiento: props.empresa,
      whatsapp: whatsappLocal(props.telefono),
      email: props.email || extraerEmail(props.historial),
      instagram: props.instagram || extraerInstagram(props.historial),
      rubro: props.rubro ? RUBRO_LABELS[props.rubro] : "",
      plan: extraerPlan(props.historial),
      ...condiciones,
    });
    setCopiado(false);
  };

  const copiar = async () => {
    if (!datos || !props.sede) return;
    await navigator.clipboard.writeText(textoAlta(datos));
    props.onAltaCopiada(datos, props.sede);
    setCopiado(true);
  };

  if (!datos) {
    return (
      <div className="recontacto-box">
        <span className="field-label">Alta en el grupo de la sede</span>
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={preparar}>
          🐝 Preparar alta para el grupo
        </button>
        <p className="field-hint">
          Para cuando ya pagó el fee y el alquiler. Busca los datos en la conversación y los deja listos para pegar.
        </p>
      </div>
    );
  }

  const faltan = camposFaltantes(datos);

  return (
    <div className="recontacto-box">
      <span className="field-label">Alta en el grupo de la sede</span>
      <div className="alta-grid">
        {CAMPOS.map((c) => (
          <label key={c.key} className={datos[c.key].trim() ? "" : "alta-campo--vacio"}>
            {c.label}
            <input
              value={datos[c.key]}
              onChange={(e) => {
                setDatos({ ...datos, [c.key]: e.target.value });
                setCopiado(false);
              }}
            />
          </label>
        ))}
        <label className={props.sede ? "" : "alta-campo--vacio"}>
          Grupo
          <select value={props.sede} onChange={(e) => props.onSedeChange(e.target.value as SedeOption | "")}>
            <option value="">Elegí la sede…</option>
            {(Object.keys(SEDE_LABELS) as SedeOption[]).map((s) => (
              <option key={s} value={s}>
                {GRUPO_SEDE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {faltan.length > 0 && (
        <p className="recontacto-alert">
          No lo encontré en la conversación: {faltan.join(", ")}. Completalo antes de copiar.
        </p>
      )}
      <pre className="alta-preview">{textoAlta(datos)}</pre>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={!props.sede} onClick={copiar}>
          {props.sede ? `📋 Copiar para el grupo de ${GRUPO_SEDE_LABELS[props.sede]}` : "📋 Elegí la sede para copiar"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={preparar} title="Vuelve a leer la conversación">
          ↻ Volver a buscar
        </button>
      </div>
      {copiado && props.sede && (
        <p className="field-hint">
          ¡Copiado! Pegalo en el grupo de {GRUPO_SEDE_LABELS[props.sede]}. Lo pasé a miembro activo y completé la ficha:
          tocá <strong>Guardar</strong> para que quede.
        </p>
      )}
    </div>
  );
}
