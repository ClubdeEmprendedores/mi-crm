import type { Lead } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS } from "../types";
import { formatUSD } from "../utils/format";
import { InstagramLink } from "./InstagramLink";

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

type Props = {
  lead: Lead;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
};

export function LeadCard({ lead, onClick, onDragStart, onDragEnd }: Props) {
  return (
    <article
      className="lead-card"
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <h3 className="lead-card-title">{lead.nombre}</h3>
      {lead.noRecontactar && (
        <p className="lead-card-badge lead-card-badge--warning">⚠ No recontactar</p>
      )}
      {lead.valorEstimado > 0 && (
        <p className="lead-card-value">{formatUSD(lead.valorEstimado)}</p>
      )}
      {lead.etapa === "ganado" && lead.sede && (
        <p className="lead-card-badge lead-card-badge--sede">
          {SEDE_LABELS[lead.sede]}
        </p>
      )}
      {lead.propuesta && (
        <p className="lead-card-badge lead-card-badge--propuesta">
          Prop: {PROPUESTA_LABELS[lead.propuesta]}
        </p>
      )}
      {lead.contactadoEn && (
        <p className="lead-card-meta">Contactado: {formatShortDate(lead.contactadoEn)}</p>
      )}
      {lead.instagram && (
        <p className="lead-card-ig">
          <InstagramLink username={lead.instagram} />
        </p>
      )}
      {lead.empresa && <p className="lead-card-meta">{lead.empresa}</p>}
      {lead.email && <p className="lead-card-detail">{lead.email}</p>}
    </article>
  );
}
