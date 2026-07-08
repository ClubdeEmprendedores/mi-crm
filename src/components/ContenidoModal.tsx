import { useEffect, useState, type FormEvent } from "react";
import type { ContenidoItem, ContenidoSede, ContenidoTipo, EstadoCopy, EstadoFoto } from "../types";
import {
  CONTENIDO_SEDE_LABELS,
  CONTENIDO_TIPO_LABELS,
  ESTADO_COPY_LABELS,
  ESTADO_FOTO_LABELS,
} from "../types";
import { useEscapeKey } from "../hooks/useEscapeKey";

type Props = {
  item: ContenidoItem;
  onClose: () => void;
  onSave: (id: string, patch: Partial<ContenidoItem>) => void;
  onDelete: (id: string) => void;
};

const ESTADOS_FOTO: EstadoFoto[] = ["pendiente", "recibida", "aprobada"];
const ESTADOS_COPY: EstadoCopy[] = ["pendiente", "borrador", "aprobado"];

export function ContenidoModal({ item, onClose, onSave, onDelete }: Props) {
  const [lightbox, setLightbox] = useState(false);
  useEscapeKey(() => (lightbox ? setLightbox(false) : onClose()));

  const [form, setForm] = useState({
    etiqueta: item.etiqueta,
    fecha: item.fecha,
    sede: item.sede,
    tipo: item.tipo,
    estadoFoto: item.estadoFoto,
    estadoCopy: item.estadoCopy,
    publicado: item.publicado,
    imageUrl: item.imageUrl ?? "",
    caption: item.caption ?? "",
    notas: item.notas ?? "",
  });

  useEffect(() => {
    setForm({
      etiqueta: item.etiqueta,
      fecha: item.fecha,
      sede: item.sede,
      tipo: item.tipo,
      estadoFoto: item.estadoFoto,
      estadoCopy: item.estadoCopy,
      publicado: item.publicado,
      imageUrl: item.imageUrl ?? "",
      caption: item.caption ?? "",
      notas: item.notas ?? "",
    });
  }, [item]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(item.id, {
      etiqueta: form.etiqueta,
      fecha: form.fecha,
      sede: form.sede,
      tipo: form.tipo,
      estadoFoto: form.estadoFoto,
      estadoCopy: form.estadoCopy,
      publicado: form.publicado,
      imageUrl: form.imageUrl || undefined,
      caption: form.caption || undefined,
      notas: form.notas || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="contenido-modal-title"
      >
        <header className="modal-header">
          <h2 id="contenido-modal-title">{item.etiqueta || "Contenido"}</h2>
          <div className="modal-header-actions">
            <button type="submit" form="contenido-form" className="btn btn-primary">
              Guardar
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </header>

        <form id="contenido-form" onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {form.imageUrl ? (
              <button
                type="button"
                className="contenido-modal-preview-btn"
                onClick={() => setLightbox(true)}
                title="Ver en pantalla completa"
              >
                <img src={form.imageUrl} alt="" className="contenido-modal-preview" />
                <span className="contenido-modal-preview-hint">🔍 Ver en pantalla completa</span>
              </button>
            ) : (
              <p className="import-empty">Sin imagen de referencia cargada todavía.</p>
            )}

            <label>
              Etiqueta
              <input
                value={form.etiqueta}
                onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </label>
              <label>
                Sede
                <select
                  value={form.sede}
                  onChange={(e) => setForm({ ...form, sede: e.target.value as ContenidoSede })}
                >
                  {(Object.keys(CONTENIDO_SEDE_LABELS) as ContenidoSede[]).map((s) => (
                    <option key={s} value={s}>{CONTENIDO_SEDE_LABELS[s]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Tipo
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as ContenidoTipo })}
              >
                {(Object.keys(CONTENIDO_TIPO_LABELS) as ContenidoTipo[]).map((t) => (
                  <option key={t} value={t}>{CONTENIDO_TIPO_LABELS[t]}</option>
                ))}
              </select>
            </label>

            <label>
              Link de referencia de la imagen (opcional)
              <input
                value={form.imageUrl}
                placeholder="https://…"
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </label>

            <label>
              Copy
              <textarea
                rows={6}
                value={form.caption}
                placeholder="Todavía no hay copy escrito."
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label>
                Estado de la foto
                <select
                  value={form.estadoFoto}
                  onChange={(e) => setForm({ ...form, estadoFoto: e.target.value as EstadoFoto })}
                >
                  {ESTADOS_FOTO.map((s) => (
                    <option key={s} value={s}>{ESTADO_FOTO_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <label>
                Estado del copy
                <select
                  value={form.estadoCopy}
                  onChange={(e) => setForm({ ...form, estadoCopy: e.target.value as EstadoCopy })}
                >
                  {ESTADOS_COPY.map((s) => (
                    <option key={s} value={s}>{ESTADO_COPY_LABELS[s]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={form.publicado}
                onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
              />
              Ya publicado
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
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (confirm("¿Eliminar este contenido del calendario?")) {
                  onDelete(item.id);
                  onClose();
                }
              }}
            >
              Eliminar
            </button>
            <div className="modal-footer-right">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </div>
          </footer>
        </form>
      </div>

      {lightbox && form.imageUrl && (
        <div
          className="contenido-lightbox"
          onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
          role="presentation"
        >
          <button
            type="button"
            className="btn-icon contenido-lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            aria-label="Cerrar"
          >
            ×
          </button>
          <img src={form.imageUrl} alt="" className="contenido-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
