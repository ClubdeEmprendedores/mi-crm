import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Contact, HistorialEntry, Lead, PropuestaOption, SedeOption, Stage } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS, STAGES, STAGE_LABELS } from "../types";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { formatDate, formatShortDate } from "../utils/format";
import { sanitizeInstagramUsername } from "../utils/instagram";
import { normalizeSearch } from "../utils/text";
import { mensajeReconexion, whatsappUrl } from "../utils/whatsapp";

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
    contactId?: string;
    motivoBaja: string;
    noRecontactar: boolean;
    tags: string[];
    historial: HistorialEntry[];
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
  contactId: "",
  motivoBaja: "",
  noRecontactar: false,
  tags: [] as string[],
  historial: [] as HistorialEntry[],
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
        contactId: lead.contactId ?? "",
        motivoBaja: lead.motivoBaja,
        noRecontactar: lead.noRecontactar,
        tags: lead.tags ?? [],
        historial: lead.historial ?? [],
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
    if (!form.nombre.trim()) return;
    const autoContactadoEn =
      form.etapa === "contactado" && !form.contactadoEn
        ? new Date().toISOString()
        : dateInputToIso(form.contactadoEn);
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
      contactId: form.contactId || undefined,
      motivoBaja: form.motivoBaja,
      noRecontactar: form.noRecontactar,
      tags: form.tags,
      historial: form.historial,
    });
    onClose();
  };

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

  const canSave = !!form.nombre.trim();

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
                required
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
            {form.etapa === "ganado" && (
              <label>
                Sede
                <select
                  value={form.sede}
                  onChange={(e) =>
                    setForm({ ...form, sede: e.target.value as SedeOption | "" })
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {(Object.keys(SEDE_LABELS) as SedeOption[]).map((s) => (
                    <option key={s} value={s}>
                      {SEDE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.etapa === "exmiembro" && (
              <>
                <label>
                  Motivo de baja
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
                  {form.historial.map((entry, i) => (
                    <li key={i} className="historial-entry">
                      <div className="historial-entry-header">
                        <span className="historial-entry-date">
                          {formatDate(entry.fecha)}
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
                  ))}
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
