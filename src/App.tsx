import { useCallback, useEffect, useRef, useState } from "react";
import { ContactModal } from "./components/ContactModal";
import { ContactsView } from "./components/ContactsView";
import { ImportModal } from "./components/ImportModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { LeadModal } from "./components/LeadModal";
import { ListView } from "./components/ListView";
import { useContacts } from "./hooks/useContacts";
import { useLeads } from "./hooks/useLeads";
import type { Contact, Lead, ViewMode } from "./types";
import {
  exportContactsCsv,
  exportFullJson,
  exportLeadsCsv,
} from "./utils/exportData";

export default function App() {
  const {
    leads, loading, error: leadsError, clearError: clearLeadsError,
    addLead, addLeads, updateLead, moveLead, deleteLead, deleteLeads,
    countDuplicates, deduplicateLeads,
  } = useLeads();
  const {
    contacts, loading: contactsLoading, error: contactsError, clearError: clearContactsError,
    addContact, updateContact, deleteContact,
  } = useContacts();

  const [view, setView] = useState<ViewMode>("kanban");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Lead | null | undefined>(undefined);
  const [editingContact, setEditingContact] = useState<Contact | null | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const appError = leadsError || contactsError;
  const clearError = () => { clearLeadsError(); clearContactsError(); };

  // Auto-dismiss error toast after 6s
  useEffect(() => {
    if (!appError) return;
    const t = setTimeout(clearError, 6000);
    return () => clearTimeout(t);
  }, [appError]);

  // Auto-dismiss success toast after 4s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const openNew = () => setEditing(null);
  const openEdit = (lead: Lead) => setEditing(lead);
  const closeModal = () => setEditing(undefined);

  const openNewContact = () => setEditingContact(null);
  const openEditContact = (c: Contact) => setEditingContact(c);
  const closeContactModal = () => setEditingContact(undefined);

  const isContactsView = view === "contactos";

  const handleViewChange = (v: ViewMode) => {
    setView(v);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    const n = ids.length;
    const s = n === 1 ? "" : "s";
    if (!window.confirm(`¿Eliminar ${n} lead${s} seleccionado${s}?`)) return;
    await deleteLeads(ids);
    setSelectedIds(new Set());
    setSuccessMsg(`Se eliminaron ${n} lead${s}.`);
  };

  const handleDeduplicate = async () => {
    const count = countDuplicates();
    if (count === 0) { setSuccessMsg("No se encontraron duplicados."); return; }
    const s = count === 1 ? "" : "s";
    if (!window.confirm(`Se encontraron ${count} lead${s} duplicado${s}. ¿Eliminar? Se conservará el más antiguo de cada grupo.`)) return;
    const deleted = await deduplicateLeads();
    if (deleted > 0) setSuccessMsg(`Se eliminaron ${deleted} lead${deleted === 1 ? "" : "s"} duplicado${deleted === 1 ? "" : "s"}.`);
  };

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
            onClick={() => handleViewChange("kanban")}
          >
            Kanban
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "lista"}
            className={view === "lista" ? "active" : ""}
            onClick={() => handleViewChange("lista")}
          >
            Listado
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "contactos"}
            className={view === "contactos" ? "active" : ""}
            onClick={() => handleViewChange("contactos")}
          >
            Contactos
          </button>
        </div>

        <div className="header-actions">
          <div className="export-wrap" ref={exportRef}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setExportOpen((o) => !o)}
            >
              Exportar ▾
            </button>
            {exportOpen && (
              <div className="export-dropdown">
                <button
                  onClick={() => { exportLeadsCsv(leads); setExportOpen(false); }}
                >
                  CSV — Leads
                </button>
                <button
                  onClick={() => { exportContactsCsv(contacts); setExportOpen(false); }}
                >
                  CSV — Contactos
                </button>
                <div className="export-dropdown-divider" />
                <button
                  onClick={() => { exportFullJson(leads, contacts); setExportOpen(false); }}
                >
                  JSON — Backup completo
                </button>
              </div>
            )}
          </div>

          {!isContactsView && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleDeduplicate}
              title="Detecta y elimina leads duplicados por nombre, Instagram o email"
            >
              Deduplicar
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setImporting(true)}
          >
            Importar
          </button>

          {isContactsView ? (
            <button type="button" className="btn btn-primary" onClick={openNewContact}>
              + Nuevo contacto
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={openNew}>
              + Nuevo lead
            </button>
          )}
        </div>
      </header>

      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-bar-count">
            {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
            Eliminar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
            Cancelar
          </button>
        </div>
      )}

      <main className="app-main">
        {loading && !isContactsView ? (
          <div className="app-loading">Cargando leads…</div>
        ) : view === "kanban" ? (
          <KanbanBoard leads={leads} onMove={moveLead} onEdit={openEdit} />
        ) : view === "lista" ? (
          <ListView
          leads={leads}
          onEdit={openEdit}
          onMove={moveLead}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
        />
        ) : (
          <ContactsView
            contacts={contacts}
            loading={contactsLoading}
            error={contactsError}
            onEdit={openEditContact}
          />
        )}
      </main>

      <footer className="app-footer">
        Club de Emprendedores · {leads.length} lead{leads.length !== 1 ? "s" : ""}
        {contacts.length > 0 && ` · ${contacts.length} contacto${contacts.length !== 1 ? "s" : ""}`}
      </footer>

      {/* Success toast */}
      {successMsg && (
        <div className="success-toast" role="status">
          <span className="error-toast-msg">{successMsg}</span>
          <button className="error-toast-close" onClick={() => setSuccessMsg(null)} aria-label="Cerrar">×</button>
        </div>
      )}

      {/* Error toast */}
      {appError && (
        <div className="error-toast" role="alert">
          <span className="error-toast-msg">{appError}</span>
          <button className="error-toast-close" onClick={clearError} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}

      {/* Lead modal */}
      {editing !== undefined && (
        <LeadModal
          lead={editing}
          contacts={contacts}
          onClose={closeModal}
          onSave={(data) => {
            const normalized = {
              ...data,
              contactadoEn: data.contactadoEn || undefined,
              propuesta: data.propuesta || undefined,
              sede: data.sede || undefined,
            };
            if (editing) {
              updateLead(editing.id, normalized);
            } else {
              addLead(normalized);
            }
          }}
          onDelete={editing ? () => deleteLead(editing.id) : undefined}
        />
      )}

      {/* Contact modal */}
      {editingContact !== undefined && (
        <ContactModal
          contact={editingContact}
          onClose={closeContactModal}
          onSave={(data) => {
            if (editingContact) {
              updateContact(editingContact.id, data);
            } else {
              addContact(data);
            }
          }}
          onDelete={editingContact ? () => deleteContact(editingContact.id) : undefined}
        />
      )}

      {/* Import modal */}
      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImport={(items) => addLeads(items)}
        />
      )}
    </div>
  );
}
