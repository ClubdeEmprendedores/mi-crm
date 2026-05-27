import { useEffect, useState, type FormEvent } from "react";
import type { Lead, PropuestaOption, SedeOption, Stage } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS, STAGES, STAGE_LABELS } from "../types";
import { sanitizeInstagramUsername } from "../utils/instagram";

type Props = {
  lead: Lead | null;
  onClose: () => void;
  onSave: (data: {
    nombre: string;
    empresa: string;
    email: string;
    telefono: string;
    instagram: string;
    notas: string;
    valorEstimado: number;
    etapa: Stage;
    contactadoEn: string;
    propuesta: PropuestaOption | "";
    sede: SedeOption | "";
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
  valorEstimado: "",
  etapa: "nuevo" as Stage,
  contactadoEn: "",
  propuesta: "" as PropuestaOption | "",
  sede: "" as SedeOption | "",
};

const FORM_ID = "lead-form";

export function LeadModal({ lead, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState(empty);
  const [maximized, setMaximized] = useState(false);

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
        valorEstimado:
          lead.valorEstimado > 0 ? String(lead.valorEstimado) : "",
        etapa: lead.etapa,
        contactadoEn: isoToDateInput(lead.contactadoEn),
        propuesta: lead.propuesta ?? "",
        sede: lead.sede ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [lead]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    const valor = parseFloat(form.valorEstimado);
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
      valorEstimado: Number.isFinite(valor) && valor >= 0 ? valor : 0,
      contactadoEn: autoContactadoEn,
      propuesta: form.propuesta,
      sede: form.sede,
    });
    onClose();
  };

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
            <label>
              Valor estimado (USD)
              <div className="input-prefix">
                <span className="input-prefix-symbol">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.valorEstimado}
                  onChange={(e) =>
                    setForm({ ...form, valorEstimado: e.target.value })
                  }
                />
              </div>
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
