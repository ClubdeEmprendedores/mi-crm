import { useEffect, useState, type FormEvent } from "react";
import type { Contact } from "../types";
import { sanitizeInstagramUsername } from "../utils/instagram";

type Props = {
  contact: Contact | null;
  onClose: () => void;
  onSave: (data: Omit<Contact, "id" | "creadoEn">) => void;
  onDelete?: () => void;
};

const empty = {
  nombre: "",
  empresa: "",
  email: "",
  telefono: "",
  instagram: "",
  notas: "",
};

const FORM_ID = "contact-form";

export function ContactModal({ contact, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (contact) {
      setForm({
        nombre: contact.nombre,
        empresa: contact.empresa,
        email: contact.email,
        telefono: contact.telefono,
        instagram: contact.instagram,
        notas: contact.notas,
      });
    } else {
      setForm(empty);
    }
  }, [contact]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onSave({
      nombre: form.nombre.trim(),
      empresa: form.empresa.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      instagram: sanitizeInstagramUsername(form.instagram),
      notas: form.notas.trim(),
    });
    onClose();
  };

  const canSave = !!form.nombre.trim();

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="contact-modal-title"
      >
        <header className="modal-header">
          <h2 id="contact-modal-title">{contact ? "Editar contacto" : "Nuevo contacto"}</h2>
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
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
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
                    setForm({ ...form, instagram: e.target.value.replace(/^@+/, "") })
                  }
                />
              </div>
            </label>
            <label>
              Notas
              <textarea
                rows={4}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </label>
          </div>

          <footer className="modal-footer">
            {contact && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (confirm("¿Eliminar este contacto?")) {
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
              <button type="submit" className="btn btn-primary" disabled={!canSave}>
                Guardar
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
