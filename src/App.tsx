import { useState } from "react";
import { KanbanBoard } from "./components/KanbanBoard";
import { ImportModal } from "./components/ImportModal";
import { LeadModal } from "./components/LeadModal";
import { ListView } from "./components/ListView";
import { useLeads } from "./hooks/useLeads";
import type { Lead, ViewMode } from "./types";

export default function App() {
  const { leads, loading, error, addLead, addLeads, updateLead, moveLead, deleteLead } = useLeads();
  const [view, setView] = useState<ViewMode>("kanban");
  const [editing, setEditing] = useState<Lead | null | undefined>(undefined);
  const [importing, setImporting] = useState(false);

  const openNew = () => setEditing(null);
  const openEdit = (lead: Lead) => setEditing(lead);
  const closeModal = () => setEditing(undefined);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <div className="app-brand-plaque">
            <img src="/cde-iso.png" alt="" className="app-brand-iso" aria-hidden />
            <img src="/cde-logo.png" alt="Club de Emprendedores" className="app-brand-wordmark" />
          </div>
          <span className="app-subtitle">CRM</span>
        </div>

        <div className="view-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === "kanban"}
            className={view === "kanban" ? "active" : ""}
            onClick={() => setView("kanban")}
          >
            Kanban
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "lista"}
            className={view === "lista" ? "active" : ""}
            onClick={() => setView("lista")}
          >
            Listado
          </button>
        </div>

        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setImporting(true)}>
            Importar
          </button>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            + Nuevo lead
          </button>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="app-loading">Cargando leads…</div>
        ) : error ? (
          <div className="app-error">Error al conectar con Supabase: {error}</div>
        ) : view === "kanban" ? (
          <KanbanBoard leads={leads} onMove={moveLead} onEdit={openEdit} />
        ) : (
          <ListView leads={leads} onEdit={openEdit} onMove={moveLead} />
        )}
      </main>

      <footer className="app-footer">
        Club de Emprendedores · {leads.length} lead
        {leads.length !== 1 ? "s" : ""} · localStorage
      </footer>

      {editing !== undefined && (
        <LeadModal
          lead={editing}
          onClose={closeModal}
          onSave={(data) => {
            if (editing) {
              updateLead(editing.id, data);
            } else {
              addLead(data);
            }
          }}
          onDelete={editing ? () => deleteLead(editing.id) : undefined}
        />
      )}

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImport={(contacts) => addLeads(contacts)}
        />
      )}
    </div>
  );
}
