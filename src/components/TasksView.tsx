import { type FormEvent, useState } from "react";
import type { Task } from "../types";

type Props = {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onAdd: (texto: string) => void;
  onToggle: (id: string, hecha: boolean) => void;
  onDelete: (id: string) => void;
  onOpenLead: (leadId: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TasksView({ tasks, loading, error, onAdd, onToggle, onDelete, onOpenLead }: Props) {
  const [texto, setTexto] = useState("");

  if (loading) {
    return <div className="app-loading">Cargando tareas…</div>;
  }

  if (error) {
    const errLower = error.toLowerCase();
    const needsMigration =
      errLower.includes("does not exist") ||
      errLower.includes("no existe") ||
      errLower.includes("could not find the table") ||
      errLower.includes("schema cache");
    return (
      <div className="contacts-migration">
        <div className="contacts-migration-box">
          <h3>Tabla de tareas no encontrada</h3>
          <p>Para activar esta función, corré el siguiente SQL en tu proyecto de Supabase:</p>
          <pre className="contacts-migration-sql">{`-- En Supabase → SQL Editor:
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto       TEXT NOT NULL DEFAULT '',
  hecha       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all" ON tasks
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
          {!needsMigration && (
            <p className="contacts-migration-error">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    onAdd(t);
    setTexto("");
  };

  const pendientes = tasks.filter((t) => !t.hecha);
  const hechas = tasks.filter((t) => t.hecha);

  return (
    <div className="tasks-wrap">
      <form className="tasks-add-form" onSubmit={handleSubmit}>
        <input
          className="tasks-add-input"
          type="text"
          placeholder="Nueva tarea…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!texto.trim()}>
          + Agregar
        </button>
      </form>

      {tasks.length === 0 ? (
        <div className="list-empty">
          <p>No hay tareas todavía.</p>
          <p className="list-empty-hint">Agregá una arriba para dejar de usar el bloc de notas.</p>
        </div>
      ) : (
        <div className="tasks-lists">
          <ul className="tasks-list">
            {pendientes.map((t) => (
              <li key={t.id} className="tasks-item">
                <label className="tasks-item-label">
                  <input
                    type="checkbox"
                    checked={t.hecha}
                    onChange={(e) => onToggle(t.id, e.target.checked)}
                  />
                  <span className="tasks-item-text">{t.texto}</span>
                </label>
                {t.leadId && (
                  <button
                    type="button"
                    className="tasks-item-lead-link"
                    onClick={() => onOpenLead(t.leadId!)}
                    title="Ver lead"
                  >
                    👤 Ver lead
                  </button>
                )}
                <span className="tasks-item-date">{formatDate(t.creadoEn)}</span>
                <button
                  type="button"
                  className="tasks-item-delete"
                  onClick={() => onDelete(t.id)}
                  aria-label="Eliminar tarea"
                  title="Eliminar tarea"
                >
                  ×
                </button>
              </li>
            ))}
            {pendientes.length === 0 && (
              <li className="tasks-empty-hint">Sin tareas pendientes 🎉</li>
            )}
          </ul>

          {hechas.length > 0 && (
            <>
              <h3 className="tasks-section-title">Hechas ({hechas.length})</h3>
              <ul className="tasks-list tasks-list--done">
                {hechas.map((t) => (
                  <li key={t.id} className="tasks-item tasks-item--done">
                    <label className="tasks-item-label">
                      <input
                        type="checkbox"
                        checked={t.hecha}
                        onChange={(e) => onToggle(t.id, e.target.checked)}
                      />
                      <span className="tasks-item-text">{t.texto}</span>
                    </label>
                    <span className="tasks-item-date">{formatDate(t.creadoEn)}</span>
                    <button
                      type="button"
                      className="tasks-item-delete"
                      onClick={() => onDelete(t.id)}
                      aria-label="Eliminar tarea"
                      title="Eliminar tarea"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
