import { useRef, useState } from "react";
import type { Lead, Stage } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS, STAGES, STAGE_COLORS, STAGE_LABELS } from "../types";
import {
  ESTADO_CONVERSACION_COLORS,
  ESTADO_CONVERSACION_LABELS,
  ESTADOS_CONVERSACION,
  type EstadoConversacion,
  getEffectiveUltimoMensaje,
  getEstadoConversacion,
  getUltimoContacto,
} from "../utils/conversacion";
import { normalizeSearch } from "../utils/text";
import { mensajeReconexion, whatsappUrl } from "../utils/whatsapp";
import { InstagramLink } from "./InstagramLink";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

type Props = {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onMove: (id: string, etapa: Stage) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onSendWhatsapp: (id: string) => void;
  onTogglePriority: (id: string, prioridad: boolean) => void;
};

type SortMode = "recientes" | "antiguos" | "recontactar";
type StageFilter = Stage | "todas";
type ConversacionFilter = EstadoConversacion | "todas";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ListView({ leads, onEdit, onMove, selectedIds, onToggleSelect, onSelectAll, onSendWhatsapp, onTogglePriority }: Props) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recientes");
  const [stageFilter, setStageFilter] = useState<StageFilter>("todas");
  const [conversacionFilter, setConversacionFilter] = useState<ConversacionFilter>("todas");

  const byStage = stageFilter === "todas" ? leads : leads.filter((l) => l.etapa === stageFilter);
  const byConversacion =
    conversacionFilter === "todas"
      ? byStage
      : byStage.filter((l) => getEstadoConversacion(l) === conversacionFilter);

  const sorted = [...byConversacion].sort((a, b) => {
    const prio = Number(b.prioridad) - Number(a.prioridad);
    if (prio !== 0) return prio;
    if (sortMode === "recontactar") {
      const aFecha = getEffectiveUltimoMensaje(a);
      const bFecha = getEffectiveUltimoMensaje(b);
      const at = aFecha ? new Date(aFecha).getTime() : -1;
      const bt = bFecha ? new Date(bFecha).getTime() : -1;
      return at - bt;
    }
    if (sortMode === "antiguos") {
      return new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime();
    }
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
  });

  const filtered = search.trim()
    ? sorted.filter((l) => {
        const q = normalizeSearch(search.trim());
        return (
          normalizeSearch(l.nombre).includes(q) ||
          normalizeSearch(l.empresa).includes(q) ||
          normalizeSearch(l.email).includes(q) ||
          normalizeSearch(l.telefono).includes(q) ||
          normalizeSearch(l.instagram).includes(q) ||
          normalizeSearch(l.notas).includes(q) ||
          l.tags.some((t) => normalizeSearch(t).includes(q))
        );
      })
    : sorted;

  const allIds = filtered.map((l) => l.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  const headerCheckRef = useRef<HTMLInputElement>(null);
  if (headerCheckRef.current) {
    headerCheckRef.current.indeterminate = someSelected && !allSelected;
  }

  if (leads.length === 0) {
    return (
      <div className="list-empty">
        <p>No hay leads todavía.</p>
        <p className="list-empty-hint">Creá uno con el botón «Nuevo lead».</p>
      </div>
    );
  }

  return (
    <div className="list-wrap">
      <div className="contacts-toolbar">
        <input
          className="contacts-search"
          type="search"
          placeholder="Buscar por nombre, teléfono, notas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="list-sort-select"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as StageFilter)}
          title="Filtrar por etapa"
        >
          <option value="todas">Todas las etapas</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="list-sort-select"
          value={conversacionFilter}
          onChange={(e) => setConversacionFilter(e.target.value as ConversacionFilter)}
          title="Filtrar por estado de la conversación"
        >
          <option value="todas">Toda conversación</option>
          {ESTADOS_CONVERSACION.map((e) => (
            <option key={e} value={e}>{ESTADO_CONVERSACION_LABELS[e]}</option>
          ))}
        </select>
        <select
          className="list-sort-select"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          title="Ordenar"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="antiguos">Más antiguos primero</option>
          <option value="recontactar">Para recontactar</option>
        </select>
        <span className="contacts-count">
          {filtered.length !== leads.length
            ? `${filtered.length} de ${leads.length}`
            : `${sorted.length} lead${sorted.length !== 1 ? "s" : ""}`}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="list-empty-hint">
          {search ? `No se encontraron leads para "${search}".` : "Sin leads en esta etapa."}
        </p>
      ) : (
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
            <th className="list-star-col"></th>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Contacto</th>
            <th>Propuesta</th>
            <th>Etapa</th>
            <th>Conversación</th>
            <th>Contactado</th>
            <th>Último mensaje</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((lead) => {
            const estado = getEstadoConversacion(lead);
            const ultimo = getUltimoContacto(lead);
            return (
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
                  onClick={(e) => e.stopPropagation()}
                  className="list-checkbox"
                />
              </td>
              <td
                className="list-star-col"
                onClick={(e) => { e.stopPropagation(); onTogglePriority(lead.id, !lead.prioridad); }}
              >
                <button
                  type="button"
                  className="list-star-btn"
                  title={lead.prioridad ? "Quitar destacado" : "Marcar como destacado"}
                  aria-label={lead.prioridad ? "Quitar destacado" : "Marcar como destacado"}
                >
                  {lead.prioridad ? "★" : "☆"}
                </button>
              </td>
              <td className="list-name">
                {lead.nombre}
                {lead.tags.length > 0 && (
                  <div className="lead-card-tags">
                    {lead.tags.map((t) => (
                      <span key={t} className="lead-card-tag">{t}</span>
                    ))}
                  </div>
                )}
              </td>
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
              <td>
                {(lead.etapa === "nuevo" || lead.etapa === "contactado") && (
                  <span
                    className="conversation-badge"
                    style={{ color: ESTADO_CONVERSACION_COLORS[estado], borderColor: ESTADO_CONVERSACION_COLORS[estado] }}
                  >
                    {ESTADO_CONVERSACION_LABELS[estado]}
                  </span>
                )}
              </td>
              <td className="list-date">
                {lead.contactadoEn ? formatDate(lead.contactadoEn) : "—"}
              </td>
              <td className="list-date list-wa-cell" onClick={(e) => e.stopPropagation()}>
                <div className="list-msg-cell">
                  <span>
                    {ultimo ? `${ultimo.quien === "yo" ? "Vos" : ultimo.quien === "ellos" ? "Ellos" : ""}: ${formatDate(ultimo.fecha)}` : "—"}
                  </span>
                  {ultimo?.texto && (
                    <span className="list-msg-preview" title={ultimo.texto}>
                      "{truncate(ultimo.texto, 40)}"
                    </span>
                  )}
                </div>
                {lead.telefono && (
                  <a
                    className="lead-card-whatsapp list-wa"
                    href={whatsappUrl(lead.telefono, mensajeReconexion(lead))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onSendWhatsapp(lead.id)}
                    title="Enviar WhatsApp"
                    aria-label="Enviar WhatsApp"
                  >
                    💬
                  </a>
                )}
              </td>
              <td className="list-date">{formatDate(lead.creadoEn)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}
