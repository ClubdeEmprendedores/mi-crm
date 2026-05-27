import type { Lead, Stage } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS, STAGES, STAGE_COLORS, STAGE_LABELS } from "../types";
import { InstagramLink } from "./InstagramLink";

type Props = {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onMove: (id: string, etapa: Stage) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ListView({ leads, onEdit, onMove }: Props) {
  const sorted = [...leads].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="list-empty">
        <p>No hay leads todavía.</p>
        <p className="list-empty-hint">Creá uno con el botón «Nuevo lead».</p>
      </div>
    );
  }

  return (
    <div className="list-wrap">
      <table className="list-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Contacto</th>
            <th>Propuesta</th>
            <th>Etapa</th>
            <th>Contactado</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => (
            <tr key={lead.id} onClick={() => onEdit(lead)}>
              <td className="list-name">{lead.nombre}</td>
              <td>{lead.empresa || "—"}</td>
              <td className="list-contact">
                {lead.instagram && (
                  <InstagramLink username={lead.instagram} />
                )}
                {lead.email && <span>{lead.email}</span>}
                {lead.telefono && <span>{lead.telefono}</span>}
                {!lead.instagram && !lead.email && !lead.telefono && "—"}
              </td>
              <td className="list-propuesta">
                {lead.propuesta ? PROPUESTA_LABELS[lead.propuesta] : "—"}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="list-stage-cell">
                  <select
                    className="list-stage-select"
                    value={lead.etapa}
                    style={{
                      borderColor: STAGE_COLORS[lead.etapa],
                      color: STAGE_COLORS[lead.etapa],
                    }}
                    onChange={(e) =>
                      onMove(lead.id, e.target.value as Stage)
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {lead.etapa === "ganado" && lead.sede && (
                    <span className="list-sede-badge">{SEDE_LABELS[lead.sede]}</span>
                  )}
                </div>
              </td>
              <td className="list-date">
                {lead.contactadoEn ? formatDate(lead.contactadoEn) : "—"}
              </td>
              <td className="list-date">{formatDate(lead.creadoEn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
