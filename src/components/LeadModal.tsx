import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  Contact, HistorialEntry, Lead, MotivoBajaTipo, PropuestaOption, RecontactoEnviado, Rubro, SedeOption, Stage,
} from "../types";
import { MOTIVO_BAJA_TIPO_LABELS, MOTIVO_BAJA_TIPOS, PROPUESTA_LABELS, RUBRO_LABELS, RUBROS, SEDE_LABELS, STAGES, STAGE_LABELS } from "../types";
import { diasDesde, parseSpeaker } from "../utils/conversacion";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { formatDate, formatShortDate } from "../utils/format";
import { sanitizeInstagramUsername } from "../utils/instagram";
import { normalizeSearch } from "../utils/text";
import { mensajePlanesSanFernando, mensajeReconexion, reporteEnviadoMensaje, whatsappUrl } from "../utils/whatsapp";

type Props = {
  lead: Lead | null;
  contacts: Contact[];
  onClose: () => void;
  onSendWhatsapp: (id: string) => void;
  onSave: (data: {
    nombre: string;
    empresa: string;
    email: string;
    telefono: string;
    instagram: string;
    notas: string;
    etapa: Stage;
    contactadoEn: string;
    propuesta: PropuestaOption | "";
    sede: SedeOption | "";
    rubro: Rubro | "";
    contactId?: string;
    motivoBaja: string;
    motivoBajaTipo: MotivoBajaTipo | "";
    fechaBaja: string;
    noRecontactar: boolean;
    tags: string[];
    historial: HistorialEntry[];
    prioridad: boolean;
    mensajeRecontacto: string;
    recontactosEnviados: RecontactoEnviado[];
  }) => void;
  onDelete?: () => void;
};

function isoToDateInput(iso?: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function dateInputToIso(date: string) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toISOString();
}

const empty = {
  nombre: "",
  empresa: "",
  email: "",
  telefono: "",
  instagram: "",
  notas: "",
  etapa: "nuevo" as Stage,
  contactadoEn: "",
  propuesta: "" as PropuestaOption | "",
  sede: "" as SedeOption | "",
  rubro: "" as Rubro | "",
  contactId: "",
  motivoBaja: "",
  motivoBajaTipo: "" as MotivoBajaTipo | "",
  fechaBaja: "",
  noRecontactar: false,
  tags: [] as string[],
  historial: [] as HistorialEntry[],
  prioridad: false,
  mensajeRecontacto: "",
  recontactosEnviados: [] as RecontactoEnviado[],
};

const FORM_ID = "lead-form";

export function LeadModal({ lead, contacts, onClose, onSave, onDelete, onSendWhatsapp }: Props) {
  const [form, setForm] = useState(empty);
  const [maximized, setMaximized] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [historialInput, setHistorialInput] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [lastSent, setLastSent] = useState<string | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose);

  useEffect(() => {
    setMaximized(false);
  }, [lead]);

  useEffect(() => {
    if (lead) {
      setForm({
        nombre: lead.nombre,
        empresa: lead.empresa,
        email: lead.email,
        telefono: lead.telefono,
        instagram: lead.instagram,
        notas: lead.notas,
        etapa: lead.etapa,
        contactadoEn: isoToDateInput(lead.contactadoEn),
        propuesta: lead.propuesta ?? "",
        sede: lead.sede ?? "",
        rubro: lead.rubro ?? "",
        contactId: lead.contactId ?? "",
        motivoBaja: lead.motivoBaja,
        motivoBajaTipo: lead.motivoBajaTipo ?? "",
        fechaBaja: isoToDateInput(lead.fechaBaja),
        noRecontactar: lead.noRecontactar,
        tags: lead.tags ?? [],
        historial: lead.historial ?? [],
        prioridad: lead.prioridad,
        mensajeRecontacto: lead.mensajeRecontacto ?? "",
        recontactosEnviados: lead.recontactosEnviados ?? [],
      });
      setWaMessage(mensajeReconexion(lead));
      setLastSent(lead.ultimoMensajeEn);
    } else {
      setForm(empty);
      setWaMessage("");
      setLastSent(undefined);
    }
    setContactSearch("");
    setDropdownOpen(false);
    setTagInput("");
    setHistorialInput("");
  }, [lead]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
    }
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setForm({ ...form, tags: form.tags.filter((x) => x !== t) });
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  };

  const addHistorialEntry = () => {
    const nota = historialInput.trim();
    if (!nota) return;
    setForm({
      ...form,
      historial: [{ fecha: new Date().toISOString(), nota }, ...form.historial],
    });
    setHistorialInput("");
  };

  const removeHistorialEntry = (index: number) => {
    setForm({ ...form, historial: form.historial.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() && !form.telefono.trim() && !form.instagram.trim() && !form.empresa.trim()) return;
    const autoContactadoEn =
      form.etapa === "contactado" && !form.contactadoEn
        ? new Date().toISOString()
        : dateInputToIso(form.contactadoEn);
    const autoFechaBaja =
      form.etapa === "exmiembro" && !form.fechaBaja
        ? new Date().toISOString()
        : dateInputToIso(form.fechaBaja);
    onSave({
      nombre: form.nombre,
      empresa: form.empresa,
      email: form.email,
      telefono: form.telefono,
      instagram: sanitizeInstagramUsername(form.instagram),
      notas: form.notas,
      etapa: form.etapa,
      contactadoEn: autoContactadoEn,
      propuesta: form.propuesta,
      sede: form.sede,
      rubro: form.rubro,
      contactId: form.contactId || undefined,
      motivoBaja: form.motivoBaja,
      motivoBajaTipo: form.motivoBajaTipo,
      fechaBaja: autoFechaBaja,
      noRecontactar: form.noRecontactar,
      tags: form.tags,
      historial: form.historial,
      prioridad: form.prioridad,
      mensajeRecontacto: form.mensajeRecontacto,
      recontactosEnviados: form.recontactosEnviados,
    });
    onClose();
  };

  const convertirEnMiembro = () => {
    setForm((f) => ({
      ...f,
      etapa: "ganado",
      contactadoEn: f.contactadoEn || isoToDateInput(new Date().toISOString()),
    }));
  };

  const registrarRecontactoEnviado = () => {
    if (!form.mensajeRecontacto.trim()) return;
    setForm((f) => ({
      ...f,
      recontactosEnviados: [
        { fecha: new Date().toISOString(), mensaje: f.mensajeRecontacto },
        ...f.recontactosEnviados,
      ],
    }));
  };

  const ultimoRecontacto = form.recontactosEnviados[0];
  const diasSinRespuestaRecontacto = ultimoRecontacto ? diasDesde(ultimoRecontacto.fecha) : null;

  const linkedContact = form.contactId
    ? contacts.find((c) => c.id === form.contactId)
    : null;

  const contactResults =
    contactSearch.length > 0
      ? contacts
          .filter((c) => {
            const q = normalizeSearch(contactSearch);
            return (
              normalizeSearch(c.nombre).includes(q) ||
              normalizeSearch(c.empresa).includes(q) ||
              normalizeSearch(c.email).includes(q)
            );
          })
          .slice(0, 6)
      : [];

  const canSave = !!(form.nombre.trim() || form.telefono.trim() || form.instagram.trim() || form.empresa.trim());

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal ${maximized ? "modal--maximized" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <h2 id="modal-title">{lead ? "Editar lead" : "Nuevo lead"}</h2>
          <div className="modal-header-actions">
            <button
              type="button"
              className={`btn-icon btn-icon--star ${form.prioridad ? "btn-icon--star-active" : ""}`}
              onClick={() => setForm({ ...form, prioridad: !form.prioridad })}
              aria-label={form.prioridad ? "Quitar destacado" : "Marcar como destacado"}
              title={form.prioridad ? "Quitar destacado" : "Marcar como destacado"}
            >
              {form.prioridad ? "★" : "☆"}
            </button>
            <button
              type="submit"
              form={FORM_ID}
              className="btn btn-primary"
              disabled={!canSave}
            >
              Guardar
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setMaximized((m) => !m)}
              aria-label={maximized ? "Restaurar tamaño" : "Maximizar"}
              title={maximized ? "Restaurar" : "Maximizar"}
            >
              {maximized ? "⊟" : "⊞"}
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <form id={FORM_ID} onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {contacts.length > 0 && (
              <div>
                <span className="field-label">Contacto vinculado</span>
                {linkedContact ? (
                  <div className="contact-linked">
                    <div className="contact-linked-info">
                      <span className="contact-linked-name">{linkedContact.nombre}</span>
                      {linkedContact.empresa && (
                        <span className="contact-linked-company">{linkedContact.empresa}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setForm({ ...form, contactId: "" })}
                      title="Desvincular contacto"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="contact-search-wrap" ref={searchRef}>
                    <input
                      className="contact-search-input"
                      placeholder="Buscar contacto existente…"
                      value={contactSearch}
                      autoComplete="off"
                      onChange={(e) => {
                        setContactSearch(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    />
                    {dropdownOpen && contactResults.length > 0 && (
                      <div className="contact-dropdown">
                        {contactResults.map((c) => (
                          <div
                            key={c.id}
                            className="contact-dropdown-item"
                            onMouseDown={() => {
                              setForm({
                                ...form,
                                contactId: c.id,
                                nombre: c.nombre,
                                empresa: c.empresa,
                                email: c.email,
                                telefono: c.telefono,
                                instagram: c.instagram,
                              });
                              setContactSearch("");
                              setDropdownOpen(false);
                            }}
                          >
                            <div className="contact-dropdown-name">{c.nombre}</div>
                            <div className="contact-dropdown-meta">
                              {[c.empresa, c.email, c.telefono].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <label>
              Nombre *
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                autoFocus
              />
            </label>
            <label>
              Empresa
              <input
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Teléfono
                <input
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                />
              </label>
            </div>
            {form.telefono && (
              <div className="whatsapp-box">
                <span className="field-label">Enviar WhatsApp</span>
                {form.etapa === "ganado" && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm whatsapp-template-btn"
                    onClick={() => setWaMessage(reporteEnviadoMensaje(form.nombre))}
                  >
                    Usar mensaje: reporte enviado por mail
                  </button>
                )}
                {form.etapa !== "ganado" && form.etapa !== "proveedor" && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm whatsapp-template-btn"
                    onClick={() => setWaMessage(mensajePlanesSanFernando(form.nombre))}
                  >
                    Usar mensaje: planes San Fernando
                  </button>
                )}
                <textarea
                  rows={3}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                />
                <a
                  className="btn btn-secondary btn-sm whatsapp-send"
                  href={whatsappUrl(form.telefono, waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (!lead) return;
                    const now = new Date().toISOString();
                    setLastSent(now);
                    onSendWhatsapp(lead.id);
                  }}
                >
                  💬 Abrir WhatsApp
                </a>
                {lastSent && (
                  <p className="whatsapp-last-sent">
                    Último mensaje: {formatShortDate(lastSent)}
                  </p>
                )}
              </div>
            )}
            {(form.etapa === "nuevo" || form.etapa === "contactado") && (
              <div className="recontacto-box">
                <span className="field-label">Mensaje de recontacto (puntual, no plantilla genérica)</span>
                {diasSinRespuestaRecontacto !== null && diasSinRespuestaRecontacto >= 7 && (
                  <p className="recontacto-alert">
                    ⏰ Ya se le mandó un recontacto hace {diasSinRespuestaRecontacto} días sin respuesta.
                    Pensalo dos veces antes de mandarle otro genérico — releé el historial.
                  </p>
                )}
                <textarea
                  rows={3}
                  placeholder="Leé el historial completo abajo y escribí algo puntual sobre dónde quedó esta conversación…"
                  value={form.mensajeRecontacto}
                  onChange={(e) => setForm({ ...form, mensajeRecontacto: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  disabled={!form.mensajeRecontacto.trim()}
                  onClick={registrarRecontactoEnviado}
                  title="Guarda este texto en el log de recontactos enviados (no lo manda solo)"
                >
                  ✓ Marcar como enviado
                </button>
                {form.recontactosEnviados.length > 0 && (
                  <ul className="recontacto-log">
                    {form.recontactosEnviados.map((r, i) => (
                      <li key={i} className="recontacto-log-item">
                        <span className="recontacto-log-date">{formatShortDate(r.fecha)}</span>: {r.mensaje}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <label>
              Etiquetas
              <div className="tag-input-row">
                {form.tags.map((t) => (
                  <span key={t} className="tag-chip">
                    {t}
                    <button
                      type="button"
                      className="tag-chip-remove"
                      onClick={() => removeTag(t)}
                      aria-label={`Quitar etiqueta ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="tag-input"
                  value={tagInput}
                  placeholder="Agregar etiqueta…"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                />
              </div>
            </label>
            <label>
              Usuario de Instagram
              <div className="input-prefix">
                <span className="input-prefix-symbol">@</span>
                <input
                  value={form.instagram}
                  placeholder="usuario"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      instagram: e.target.value.replace(/^@+/, ""),
                    })
                  }
                />
              </div>
            </label>
            <div className="form-row">
              <label>
                Etapa
                <select
                  value={form.etapa}
                  onChange={(e) =>
                    setForm({ ...form, etapa: e.target.value as Stage })
                  }
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              {lead && form.etapa !== "ganado" && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={convertirEnMiembro}
                  title="Pasa la etapa a Miembro y baja directo a elegir la sede"
                >
                  ✅ Convertir en miembro
                </button>
              )}
            </div>
            {form.etapa === "ganado" && (
              <label>
                Sede
                <select
                  value={form.sede}
                  onChange={(e) =>
                    setForm({ ...form, sede: e.target.value as SedeOption | "" })
                  }
                  style={!form.sede ? { borderColor: "#f87171" } : undefined}
                >
                  <option value="">— Sin especificar —</option>
                  {(Object.keys(SEDE_LABELS) as SedeOption[]).map((s) => (
                    <option key={s} value={s}>
                      {SEDE_LABELS[s]}
                    </option>
                  ))}
                </select>
                {!form.sede && (
                  <span className="field-hint field-hint--warning">
                    Elegí una sede — con "Sin especificar" no aparece en métricas ni en campañas por sede.
                  </span>
                )}
              </label>
            )}
            {form.etapa === "exmiembro" && (
              <>
                <div className="form-row">
                  <label>
                    Motivo de baja (tipo)
                    <select
                      value={form.motivoBajaTipo}
                      onChange={(e) => setForm({ ...form, motivoBajaTipo: e.target.value as MotivoBajaTipo | "" })}
                    >
                      <option value="">— Sin especificar —</option>
                      {MOTIVO_BAJA_TIPOS.map((t) => (
                        <option key={t} value={t}>{MOTIVO_BAJA_TIPO_LABELS[t]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fecha de baja
                    <input
                      type="date"
                      value={form.fechaBaja}
                      onChange={(e) => setForm({ ...form, fechaBaja: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Motivo de baja (detalle)
                  <textarea
                    rows={3}
                    placeholder="¿Por qué dejó de ser miembro?"
                    value={form.motivoBaja}
                    onChange={(e) => setForm({ ...form, motivoBaja: e.target.value })}
                  />
                </label>
                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={form.noRecontactar}
                    onChange={(e) => setForm({ ...form, noRecontactar: e.target.checked })}
                  />
                  No recontactar (la salida no fue buena)
                </label>
              </>
            )}
            <div className="form-row">
              <label>
                Propuesta enviada
                <select
                  value={form.propuesta}
                  onChange={(e) =>
                    setForm({ ...form, propuesta: e.target.value as PropuestaOption | "" })
                  }
                >
                  <option value="">— Ninguna —</option>
                  {(Object.keys(PROPUESTA_LABELS) as PropuestaOption[]).map((p) => (
                    <option key={p} value={p}>
                      {PROPUESTA_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Rubro
                <select
                  value={form.rubro}
                  onChange={(e) => setForm({ ...form, rubro: e.target.value as Rubro | "" })}
                >
                  <option value="">— Sin definir —</option>
                  {RUBROS.map((r) => (
                    <option key={r} value={r}>
                      {RUBRO_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Fecha de contacto
                <input
                  type="date"
                  value={form.contactadoEn}
                  onChange={(e) =>
                    setForm({ ...form, contactadoEn: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Notas
              <textarea
                rows={maximized ? 8 : 4}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </label>
            <div className="historial-box">
              <span className="field-label">Historial de conversación</span>
              {form.historial.length > 0 && (
                <ul className="historial-list">
                  {form.historial.map((entry, i) => {
                    const speaker = parseSpeaker(entry.nota);
                    return (
                    <li key={i} className="historial-entry">
                      <div className="historial-entry-header">
                        <span className="historial-entry-date">
                          {speaker === "yo" ? "🟢 Vos" : speaker === "ellos" ? "🔵 Ellos" : ""} {formatDate(entry.fecha)}
                        </span>
                        <button
                          type="button"
                          className="historial-entry-remove"
                          onClick={() => removeHistorialEntry(i)}
                          aria-label="Eliminar entrada del historial"
                        >
                          ×
                        </button>
                      </div>
                      <p className="historial-entry-text">{entry.nota}</p>
                    </li>
                    );
                  })}
                </ul>
              )}
              <div className="historial-add">
                <textarea
                  rows={2}
                  placeholder="¿Qué se le mandó? ¿Qué respondió?"
                  value={historialInput}
                  onChange={(e) => setHistorialInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm historial-add-btn"
                  onClick={addHistorialEntry}
                  disabled={!historialInput.trim()}
                >
                  + Agregar al historial
                </button>
              </div>
            </div>
          </div>

          <footer className="modal-footer">
            {lead && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (confirm("¿Eliminar este lead?")) {
                    onDelete();
                    onClose();
                  }
                }}
              >
                Eliminar
              </button>
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSave}
              >
                Guardar
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
