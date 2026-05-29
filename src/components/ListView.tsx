import { useRef } from "react";
import type { Lead, Stage } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS, STAGES, STAGE_COLORS, STAGE_LABELS } from "../types";
import { InstagramLink } from "./InstagramLink";

type Props = {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onMove: (id: string, etapa: Stage) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ListView({ leads, onEdit, onMove, selectedIds, onToggleSelect, onSelectAll }: Props) {
  const sorted = [...leads].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
  );
  const allIds = sorted.map((l) => l.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  const headerCheckRef = useRef<HTMLInputElement>(null);
  if (headerCheckRef.current) {
    headerCheckRef.current.indeterminate = someSelected && !allSelected;
  }

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
            <th className="list-check-col" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                ref={headerCheckRef}
                checked={allSelected}
                onChange={() => onSelectAll(allIds)}
                className="list-checkbox"
              />
            </th>
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
            <tr
              key={lead.id}
              onClick={() => onEdit(lead)}
              className={selectedIds.has(lead.id) ? "selected" : ""}
            >
              <td
                className="list-check-col"
                onClick={(e) => { e.stopPropagation(); onToggleSelect(lead.id); }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(lead.id)}
                  onChange={() => onToggleSelect(lead.id)}
                  className="list-checkbox"
                />
              </td>
              <td className="list-name">{lead.nombre}</td>
              <td>{lead.empresa || "—"}</td>
              <td className="list-contact">
                {lead.instagram && <InstagramLink username={lead.instagram} />}
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
                    style={{ borderColor: STAGE_COLORS[lead.etapa], color: STAGE_COLORS[lead.etapa] }}
                    onChange={(e) => onMove(lead.id, e.target.value as Stage)}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{STAGE_LABELS[s]}</option>
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
