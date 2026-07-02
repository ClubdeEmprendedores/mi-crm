import type { Lead } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS } from "../types";
import { formatShortDate } from "../utils/format";
import { mensajeReconexion, whatsappUrl } from "../utils/whatsapp";
import { InstagramLink } from "./InstagramLink";

type Props = {
  lead: Lead;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onSendWhatsapp: (id: string) => void;
  onTogglePriority?: (id: string, prioridad: boolean) => void;
};

export function LeadCard({ lead, onClick, onDragStart, onDragEnd, onSendWhatsapp, onTogglePriority }: Props) {
  return (
    <article
      className={`lead-card ${lead.prioridad ? "lead-card--priority" : ""}`}
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
      {onTogglePriority && (
        <button
          type="button"
          className="lead-card-star"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePriority(lead.id, !lead.prioridad);
          }}
          title={lead.prioridad ? "Quitar destacado" : "Marcar como destacado"}
          aria-label={lead.prioridad ? "Quitar destacado" : "Marcar como destacado"}
        >
          {lead.prioridad ? "★" : "☆"}
        </button>
      )}
      {lead.telefono && (
        <a
          className="lead-card-whatsapp"
          href={whatsappUrl(lead.telefono, mensajeReconexion(lead))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            onSendWhatsapp(lead.id);
          }}
          title="Enviar WhatsApp"
          aria-label="Enviar WhatsApp"
        >
          💬
        </a>
      )}
      <h3 className="lead-card-title">{lead.nombre}</h3>
      {lead.noRecontactar && (
        <p className="lead-card-badge lead-card-badge--warning">⚠ No recontactar</p>
      )}
      {lead.tags.length > 0 && (
        <div className="lead-card-tags">
          {lead.tags.map((t) => (
            <span key={t} className="lead-card-tag">{t}</span>
          ))}
        </div>
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
      {lead.ultimoMensajeEn && (
        <p className="lead-card-meta">Último msj: {formatShortDate(lead.ultimoMensajeEn)}</p>
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
