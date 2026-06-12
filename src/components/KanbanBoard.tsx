import { useState } from "react";
import type { Lead, Stage } from "../types";
import { STAGES, STAGE_COLORS, STAGE_LABELS } from "../types";
import { LeadCard } from "./LeadCard";

type Props = {
  leads: Lead[];
  onMove: (id: string, etapa: Stage) => void;
  onEdit: (lead: Lead) => void;
  onSendWhatsapp: (id: string) => void;
};

export function KanbanBoard({ leads, onMove, onEdit, onSendWhatsapp }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);

  const byStage = (stage: Stage) => leads.filter((l) => l.etapa === stage);

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
    <div className="kanban">
      {STAGES.map((stage) => {
        const items = byStage(stage);
        const isTarget = dropTarget === stage;
        return (
          <section
            key={stage}
            className={`kanban-column ${isTarget ? "kanban-column--drop" : ""}`}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <header
              className="kanban-column-header"
              style={{ borderColor: STAGE_COLORS[stage] }}
            >
              <span
                className="kanban-dot"
                style={{ background: STAGE_COLORS[stage] }}
              />
              <h2>{STAGE_LABELS[stage]}</h2>
              <span className="kanban-count">{items.length}</span>
            </header>
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
                  {draggingId ? "Soltar aquí" : "Sin leads"}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
