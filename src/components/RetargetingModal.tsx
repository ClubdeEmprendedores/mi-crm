import { useMemo, useRef, useState } from "react";
import type { Lead, Stage } from "../types";
import { PROPUESTA_LABELS, STAGES, STAGE_LABELS } from "../types";
import { useEscapeKey } from "../hooks/useEscapeKey";
import {
  ESTADO_CONVERSACION_COLORS,
  ESTADO_CONVERSACION_LABELS,
  ESTADOS_CONVERSACION,
  type EstadoConversacion,
  getEffectiveUltimoMensaje,
  getEstadoConversacion,
  getUltimoContacto,
  iniciadoPorEllos,
} from "../utils/conversacion";
import { formatShortDate } from "../utils/format";
import { normalizeSearch } from "../utils/text";
import {
  aplicarPlantilla,
  BONIFICACION_SANTELMO_TAG,
  bonificacionSanTelmoMensajes,
  mensajeEsperandoTuRespuesta,
  mensajeNuncaRespondioSaludo,
  mensajePrimerContacto,
  mensajeSinRespuestaDeEllos,
  whatsappUrl,
} from "../utils/whatsapp";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

type Props = {
  leads: Lead[];
  onClose: () => void;
  onApplyTag: (id: string, tags: string[]) => void;
  onSendWhatsapp: (id: string) => void;
};

const DEFAULT_STAGES: Stage[] = ["nuevo", "contactado"];
const PREVIEW_LIMIT = 150;

function todayTag() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  return `📣 Campaña ${dd}-${mm}`;
}

/** Con rotación activa reparte una de las 6 variantes según la posición del lead en el filtro; si no, usa la plantilla única. */
function mensajeParaLead(nombre: string, indexEnFiltro: number, rotarVariantes: boolean, mensaje: string): string {
  if (rotarVariantes) {
    const variantes = bonificacionSanTelmoMensajes;
    return variantes[indexEnFiltro % variantes.length](nombre);
  }
  return aplicarPlantilla(mensaje, nombre);
}

type QuickSendCardProps = {
  lead: Lead;
  position: number;
  total: number;
  defaultMessage: string;
  onSend: (lead: Lead, mensaje: string) => void;
  onSkip: () => void;
  onPrev: () => void;
  canPrev: boolean;
};

/** Tarjeta de un solo lead a la vez, para mandar mensajes rápido sin ir y volver a una tabla. */
function QuickSendCard({ lead, position, total, defaultMessage, onSend, onSkip, onPrev, canPrev }: QuickSendCardProps) {
  const [text, setText] = useState(defaultMessage);
  const estado = getEstadoConversacion(lead);
  const ultimo = getUltimoContacto(lead);
  const sendLinkRef = useRef<HTMLAnchorElement>(null);

  return (
    <div className="quick-send-card">
      <div className="quick-send-progress">
        Lead {position} de {total} · Ctrl+Enter para enviar y pasar al siguiente
      </div>
      <div className="quick-send-lead">
        <h3>{lead.nombre}</h3>
        <div className="quick-send-meta">
          {lead.empresa && <span>{lead.empresa}</span>}
          <span
            className="conversation-badge"
            style={{ color: ESTADO_CONVERSACION_COLORS[estado], borderColor: ESTADO_CONVERSACION_COLORS[estado] }}
          >
            {ESTADO_CONVERSACION_LABELS[estado]}
          </span>
          {lead.propuesta && <span>Prop: {PROPUESTA_LABELS[lead.propuesta]}</span>}
          {lead.tags.length > 0 && (
            <div className="lead-card-tags">
              {lead.tags.map((t) => (
                <span key={t} className="lead-card-tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        {ultimo?.texto && (
          <p className="quick-send-ultimo">
            {ultimo.quien === "yo" ? "Vos" : ultimo.quien === "ellos" ? "Ellos" : "Últ."}
            {" "}({formatShortDate(ultimo.fecha)}): "{ultimo.texto}"
          </p>
        )}
      </div>

      <textarea
        className="quick-send-textarea"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            sendLinkRef.current?.click();
          }
        }}
      />

      <div className="quick-send-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPrev} disabled={!canPrev}>
          ← Anterior
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSkip}>
          Saltar →
        </button>
        <a
          ref={sendLinkRef}
          className="btn btn-secondary whatsapp-send quick-send-btn"
          href={whatsappUrl(lead.telefono, text)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onSend(lead, text)}
          title="Ctrl+Enter para enviar y pasar al siguiente"
        >
          💬 Enviar y siguiente
        </a>
      </div>
    </div>
  );
}

export function RetargetingModal({ leads, onClose, onApplyTag, onSendWhatsapp }: Props) {
  useEscapeKey(onClose);

  const [stageFilter, setStageFilter] = useState<Set<Stage>>(new Set(DEFAULT_STAGES));
  const [conversacionFilter, setConversacionFilter] = useState<Set<EstadoConversacion>>(
    new Set(ESTADOS_CONVERSACION),
  );
  const [soloFrios, setSoloFrios] = useState(true);
  const [soloIniciadoPorEllos, setSoloIniciadoPorEllos] = useState(false);
  const [diasFrio, setDiasFrio] = useState(14);
  const [excludeTagged, setExcludeTagged] = useState(true);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState(todayTag());
  const [mensaje, setMensaje] = useState(
    "¡Hola {nombre}! Soy Mati, de Club de Emprendedores. ¿Cómo va tu emprendimiento? Te cuento cómo podés tener tu espacio en nuestro showroom.",
  );
  const [rotarVariantes, setRotarVariantes] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [quickMode, setQuickMode] = useState(false);
  const [quickIndex, setQuickIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const toggleStage = (s: Stage) => {
    setStageFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const toggleConversacion = (e: EstadoConversacion) => {
    setConversacionFilter((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e); else next.add(e);
      return next;
    });
  };

  const matched = useMemo(() => {
    const q = normalizeSearch(search.trim());
    const cutoff = Date.now() - diasFrio * 24 * 60 * 60 * 1000;
    return leads
      .filter((l) => {
        if (!l.telefono) return false;
        if (l.noRecontactar) return false;
        if (!stageFilter.has(l.etapa)) return false;
        if (!conversacionFilter.has(getEstadoConversacion(l))) return false;
        if (soloIniciadoPorEllos && !iniciadoPorEllos(l)) return false;
        if (excludeTagged && tag && l.tags.includes(tag)) return false;
        if (soloFrios) {
          const fecha = getEffectiveUltimoMensaje(l);
          const last = fecha ? new Date(fecha).getTime() : null;
          if (last !== null && last >= cutoff) return false;
        }
        if (q) {
          const hay =
            normalizeSearch(l.nombre).includes(q) ||
            normalizeSearch(l.empresa).includes(q) ||
            normalizeSearch(l.instagram).includes(q) ||
            l.tags.some((t) => normalizeSearch(t).includes(q));
          if (!hay) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aFecha = getEffectiveUltimoMensaje(a);
        const bFecha = getEffectiveUltimoMensaje(b);
        const at = aFecha ? new Date(aFecha).getTime() : -1;
        const bt = bFecha ? new Date(bFecha).getTime() : -1;
        return at - bt;
      });
  }, [leads, stageFilter, conversacionFilter, soloFrios, soloIniciadoPorEllos, diasFrio, excludeTagged, tag, search]);

  const shown = matched.slice(0, PREVIEW_LIMIT);

  const queue = useMemo(() => matched.filter((l) => !sent.has(l.id)), [matched, sent]);
  const currentIndex = Math.min(quickIndex, Math.max(queue.length - 1, 0));
  const currentLead = queue[currentIndex];
  const currentLeadIndexEnFiltro = currentLead ? matched.findIndex((l) => l.id === currentLead.id) : -1;

  const handleSend = (lead: Lead) => {
    onSendWhatsapp(lead.id);
    if (tag.trim() && !lead.tags.includes(tag.trim())) {
      onApplyTag(lead.id, [...lead.tags, tag.trim()]);
    }
    setSent((prev) => new Set(prev).add(lead.id));
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal campaign-modal reporte-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="retargeting-title"
      >
        <header className="modal-header">
          <h2 id="retargeting-title">Campaña de retargeting</h2>
          <div className="modal-header-actions">
            <button
              type="button"
              className={`btn btn-sm ${quickMode ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setQuickMode((m) => {
                  const next = !m;
                  setFiltersOpen(!next);
                  return next;
                });
                setQuickIndex(0);
              }}
            >
              🚀 Modo rápido
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        <div className="campaign-body">
          <p className="campaign-intro">
            {quickMode
              ? "Un lead a la vez: editá el mensaje si hace falta y mandalo. Al enviar (o saltar) pasa solo al siguiente."
              : "Elegí a quién apuntar y qué mensaje mandarles. Cada envío marca al lead como contactado y le aplica la etiqueta, así no se repite en la próxima campaña."}
          </p>

          <button
            type="button"
            className="btn btn-ghost btn-sm retargeting-filters-toggle"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            {filtersOpen ? "▾" : "▸"} Filtros y mensaje
            {!filtersOpen && ` · ${matched.length} lead${matched.length !== 1 ? "s" : ""}`}
          </button>

          {filtersOpen && (
          <div className="retargeting-filters">
            <div>
              <span className="field-label">Etapas incluidas</span>
              <div className="retargeting-stage-checks">
                {STAGES.map((s) => (
                  <label key={s} className="field-checkbox field-checkbox--inline">
                    <input
                      type="checkbox"
                      checked={stageFilter.has(s)}
                      onChange={() => toggleStage(s)}
                    />
                    {STAGE_LABELS[s]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Estado de la conversación</span>
              <div className="retargeting-stage-checks">
                {ESTADOS_CONVERSACION.map((e) => (
                  <label key={e} className="field-checkbox field-checkbox--inline">
                    <input
                      type="checkbox"
                      checked={conversacionFilter.has(e)}
                      onChange={() => toggleConversacion(e)}
                    />
                    {ESTADO_CONVERSACION_LABELS[e]}
                  </label>
                ))}
              </div>
            </div>

            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={soloFrios}
                onChange={(e) => setSoloFrios(e.target.checked)}
              />
              Solo fríos: nunca contactados o sin mensaje hace más de
              <input
                type="number"
                min={1}
                className="retargeting-days-input"
                value={diasFrio}
                onChange={(e) => setDiasFrio(Number(e.target.value) || 1)}
                disabled={!soloFrios}
              />
              días
            </label>

            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={soloIniciadoPorEllos}
                onChange={(e) => setSoloIniciadoPorEllos(e.target.checked)}
              />
              Solo quienes escribieron primero pidiendo info (no contacto en frío tuyo)
            </label>

            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={excludeTagged}
                onChange={(e) => setExcludeTagged(e.target.checked)}
              />
              Excluir leads que ya tienen la etiqueta de esta campaña
            </label>

            <label className="campaign-tag-label">
              Buscar dentro del filtro (nombre, empresa, instagram, tag)
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="opcional" />
            </label>

            <label className="campaign-tag-label">
              Etiqueta a aplicar al enviar
              <input value={tag} onChange={(e) => setTag(e.target.value)} />
            </label>

            <label className="campaign-tag-label">
              Mensaje (usá {"{nombre}"} para el nombre de pila)
              <div className="retargeting-template-btns">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm whatsapp-template-btn"
                  onClick={() => { setMensaje(mensajePrimerContacto("{nombre}")); setRotarVariantes(false); }}
                >
                  🆕 Primer contacto
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm whatsapp-template-btn"
                  onClick={() => { setMensaje(mensajeSinRespuestaDeEllos("{nombre}")); setRotarVariantes(false); }}
                >
                  🔴 No respondió
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm whatsapp-template-btn"
                  onClick={() => {
                    setMensaje(mensajeNuncaRespondioSaludo("{nombre}"));
                    setRotarVariantes(false);
                    setSoloIniciadoPorEllos(true);
                    setConversacionFilter(new Set(["sin_respuesta_de_ellos"]));
                  }}
                >
                  📩 Escribió y no respondió el saludo
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm whatsapp-template-btn"
                  onClick={() => { setMensaje(mensajeEsperandoTuRespuesta("{nombre}")); setRotarVariantes(false); }}
                >
                  🟡 Esperaba tu respuesta
                </button>
                <button
                  type="button"
                  className={`btn btn-sm whatsapp-template-btn ${rotarVariantes ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => { setRotarVariantes(true); setTag(BONIFICACION_SANTELMO_TAG); }}
                >
                  🎁 Bonificación San Telmo (6 estilos)
                </button>
              </div>
              {rotarVariantes ? (
                <div className="whatsapp-box">
                  <span className="field-label">
                    Se reparte 1 de estas 6 variantes por lead, rotando en el orden de la lista de abajo:
                  </span>
                  {bonificacionSanTelmoMensajes.map((fn, i) => (
                    <p key={i} className="quick-send-ultimo">{i + 1}. "{fn("{nombre}")}"</p>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setRotarVariantes(false)}
                  >
                    ✖ Volver a mensaje único
                  </button>
                </div>
              ) : (
                <textarea rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
              )}
            </label>
          </div>
          )}

          {quickMode ? (
            currentLead ? (
              <QuickSendCard
                key={currentLead.id}
                lead={currentLead}
                position={currentIndex + 1}
                total={queue.length}
                defaultMessage={mensajeParaLead(currentLead.nombre, currentLeadIndexEnFiltro, rotarVariantes, mensaje)}
                onSend={(lead) => handleSend(lead)}
                onSkip={() => setQuickIndex((i) => Math.min(i + 1, Math.max(queue.length - 1, 0)))}
                onPrev={() => setQuickIndex((i) => Math.max(i - 1, 0))}
                canPrev={currentIndex > 0}
              />
            ) : (
              <p className="list-empty-hint">
                {matched.length === 0
                  ? "Sin leads que cumplan estos filtros."
                  : "¡Terminaste la cola de esta tanda! 🎉 Ajustá los filtros si querés seguir con otro grupo."}
              </p>
            )
          ) : (
          <div className="import-table-wrap campaign-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Etapa</th>
                  <th>Conversación</th>
                  <th>Etiquetas</th>
                  <th>Último mensaje</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((lead, idx) => {
                  const estado = getEstadoConversacion(lead);
                  const ultimo = getUltimoContacto(lead);
                  return (
                  <tr key={lead.id}>
                    <td className="list-name">{lead.nombre}</td>
                    <td>{STAGE_LABELS[lead.etapa]}</td>
                    <td>
                      <span
                        className="conversation-badge"
                        style={{ color: ESTADO_CONVERSACION_COLORS[estado], borderColor: ESTADO_CONVERSACION_COLORS[estado] }}
                      >
                        {ESTADO_CONVERSACION_LABELS[estado]}
                      </span>
                    </td>
                    <td>
                      {lead.tags.length > 0 ? (
                        <div className="lead-card-tags">
                          {lead.tags.map((t) => (
                            <span key={t} className="lead-card-tag">{t}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="import-empty">—</span>
                      )}
                    </td>
                    <td>
                      {ultimo ? formatShortDate(ultimo.fecha) : "Nunca"}
                      {ultimo?.texto && (
                        <div className="list-msg-preview" title={ultimo.texto}>
                          "{truncate(ultimo.texto, 40)}"
                        </div>
                      )}
                    </td>
                    <td>
                      <a
                        className="lead-card-whatsapp campaign-wa"
                        href={whatsappUrl(lead.telefono, mensajeParaLead(lead.nombre, idx, rotarVariantes, mensaje))}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSend(lead)}
                        title="Enviar WhatsApp"
                        aria-label="Enviar WhatsApp"
                      >
                        {sent.has(lead.id) ? "✅" : "💬"}
                      </a>
                    </td>
                  </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="import-empty" style={{ textAlign: "center", padding: "1rem" }}>
                      Sin leads que cumplan estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        <footer className="modal-footer">
          <span className="campaign-summary">
            {matched.length} lead{matched.length !== 1 ? "s" : ""} en el filtro
            {matched.length > PREVIEW_LIMIT && ` · mostrando los primeros ${PREVIEW_LIMIT}`}
            {sent.size > 0 && ` · ${sent.size} enviados en esta sesión`}
          </span>
          <div className="modal-footer-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
