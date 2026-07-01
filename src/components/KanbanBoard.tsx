import { useEffect, useState } from "react";
import type { Lead, Stage, Task } from "../types";
import { STAGES, STAGE_COLORS, STAGE_LABELS } from "../types";
import { normalizeSearch } from "../utils/text";
import { LeadCard } from "./LeadCard";

type Props = {
  leads: Lead[];
  onMove: (id: string, etapa: Stage) => void;
  onEdit: (lead: Lead) => void;
  onSendWhatsapp: (id: string) => void;
  tasks: Task[];
  onToggleTask: (id: string, hecha: boolean) => void;
};

const COLLAPSE_KEY = "cde-crm-kanban-collapsed";
const TASKS_PANEL_ID = "__tareas__";

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function KanbanBoard({ leads, onMove, onEdit, onSendWhatsapp, tasks, onToggleTask }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed]));
  }, [collapsed]);

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const q = normalizeSearch(search.trim());
  const filtered = q
    ? leads.filter(
        (l) =>
          normalizeSearch(l.nombre).includes(q) ||
          normalizeSearch(l.empresa).includes(q) ||
          normalizeSearch(l.email).includes(q) ||
          normalizeSearch(l.telefono).includes(q) ||
          normalizeSearch(l.instagram).includes(q) ||
          normalizeSearch(l.notas).includes(q) ||
          l.tags.some((t) => normalizeSearch(t).includes(q)),
      )
    : leads;

  const byStage = (stage: Stage) => filtered.filter((l) => l.etapa === stage);
  const hasAny = (stage: Stage) => leads.some((l) => l.etapa === stage);
  const pendingTasks = tasks.filter((t) => !t.hecha);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(stage);
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMove(id, stage);
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <div className="kanban-wrap">
      <div className="kanban-toolbar">
        <input
          className="contacts-search"
          type="search"
          placeholder="Buscar por nombre, empresa, teléfono, notas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {q && (
          <span className="contacts-count">
            {filtered.length} de {leads.length}
          </span>
        )}
      </div>
      <div className="kanban">
      {STAGES.map((stage) => {
        const items = byStage(stage);
        const isTarget = dropTarget === stage;
        const isCollapsed = collapsed.has(stage);
        return (
          <section
            key={stage}
            className={`kanban-column ${isTarget ? "kanban-column--drop" : ""} ${isCollapsed ? "kanban-column--collapsed" : ""}`}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <header
              className="kanban-column-header"
              style={{ borderColor: STAGE_COLORS[stage] }}
              onClick={() => toggleCollapsed(stage)}
              role="button"
              tabIndex={0}
              title={isCollapsed ? "Expandir" : "Contraer"}
            >
              <span
                className="kanban-dot"
                style={{ background: STAGE_COLORS[stage] }}
              />
              <h2>{STAGE_LABELS[stage]}</h2>
              <span className="kanban-count">{items.length}</span>
              <span className="kanban-collapse-icon">{isCollapsed ? "›" : "‹"}</span>
            </header>
            {!isCollapsed && (
              <div className="kanban-column-body">
                {items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onEdit(lead)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onSendWhatsapp={onSendWhatsapp}
                  />
                ))}
                {items.length === 0 && (
                  <p className="kanban-empty">
                    {draggingId ? "Soltar aquí" : q && hasAny(stage) ? "Sin resultados" : "Sin leads"}
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
      {(() => {
        const isCollapsed = collapsed.has(TASKS_PANEL_ID);
        return (
          <section className={`kanban-column kanban-column--tasks ${isCollapsed ? "kanban-column--collapsed" : ""}`}>
            <header
              className="kanban-column-header"
              style={{ borderColor: "var(--honey)" }}
              onClick={() => toggleCollapsed(TASKS_PANEL_ID)}
              role="button"
              tabIndex={0}
              title={isCollapsed ? "Expandir" : "Contraer"}
            >
              <span className="kanban-dot" style={{ background: "var(--honey)" }} />
              <h2>Tareas pendientes</h2>
              <span className="kanban-count">{pendingTasks.length}</span>
              <span className="kanban-collapse-icon">{isCollapsed ? "›" : "‹"}</span>
            </header>
            {!isCollapsed && (
              <div className="kanban-column-body">
                {pendingTasks.length === 0 ? (
                  <p className="kanban-empty">Sin tareas pendientes 🎉</p>
                ) : (
                  <ul className="tasks-list">
                    {pendingTasks.map((t) => (
                      <li key={t.id} className="tasks-item">
                        <label className="tasks-item-label">
                          <input
                            type="checkbox"
                            checked={t.hecha}
                            onChange={(e) => onToggleTask(t.id, e.target.checked)}
                          />
                          <span className="tasks-item-text">{t.texto}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })()}
      </div>
    </div>
  );
}
