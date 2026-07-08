import { useCallback, useEffect, useRef, useState } from "react";
import { CampaignModal } from "./components/CampaignModal";
import { ContactModal } from "./components/ContactModal";
import { ContactsView } from "./components/ContactsView";
import { ContenidoView } from "./components/ContenidoView";
import { ImportModal } from "./components/ImportModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { LeadModal } from "./components/LeadModal";
import { ListView } from "./components/ListView";
import { MetricsView } from "./components/MetricsView";
import { ReporteMensualModal } from "./components/ReporteMensualModal";
import { RetargetingModal } from "./components/RetargetingModal";
import { TasksView } from "./components/TasksView";
import { useContacts } from "./hooks/useContacts";
import { useContenido } from "./hooks/useContenido";
import { useLeads } from "./hooks/useLeads";
import { useTasks } from "./hooks/useTasks";
import type { Contact, Lead, ViewMode } from "./types";
import { leadsParaRecalcular } from "./utils/conversacion";
import {
  exportContactsCsv,
  exportFullJson,
  exportLeadsCsv,
} from "./utils/exportData";
import { mergeHistorial } from "./utils/mergeHistorial";
import { phonesMatch } from "./utils/phone";

export default function App() {
  const {
    leads, loading, error: leadsError, clearError: clearLeadsError,
    addLead, addLeads, updateLead, moveLead, deleteLead, deleteLeads,
    countDuplicates, deduplicateLeads, recalcularEtapas,
  } = useLeads();
  const {
    contacts, loading: contactsLoading, error: contactsError, clearError: clearContactsError,
    addContact, updateContact, deleteContact,
  } = useContacts();
  const {
    tasks, loading: tasksLoading, error: tasksError, clearError: clearTasksError,
    addTask, toggleTask, deleteTask,
  } = useTasks();
  const {
    items: contenidoItems, loading: contenidoLoading, error: contenidoError, clearError: clearContenidoError,
    updateItem: updateContenidoItem, deleteItem: deleteContenidoItem,
  } = useContenido();

  const [view, setView] = useState<ViewMode>("kanban");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Lead | null | undefined>(undefined);
  const [editingContact, setEditingContact] = useState<Contact | null | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [reporteOpen, setReporteOpen] = useState(false);
  const [retargetingOpen, setRetargetingOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMigrationError = (msg: string | null) => !!msg && (
    msg.toLowerCase().includes("does not exist") ||
    msg.toLowerCase().includes("no existe") ||
    msg.toLowerCase().includes("could not find the table") ||
    msg.toLowerCase().includes("schema cache")
  );
  const isTasksMigrationError = isMigrationError(tasksError);
  const isContenidoMigrationError = isMigrationError(contenidoError);
  const appError = leadsError || contactsError
    || (isTasksMigrationError ? null : tasksError)
    || (isContenidoMigrationError ? null : contenidoError);
  const clearError = () => { clearLeadsError(); clearContactsError(); clearTasksError(); clearContenidoError(); };

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
  const openLeadById = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) setEditing(lead);
  };
  const closeModal = () => setEditing(undefined);

  const openNewContact = () => setEditingContact(null);
  const openEditContact = (c: Contact) => setEditingContact(c);
  const closeContactModal = () => setEditingContact(undefined);

  const isContactsView = view === "contactos";
  const isTasksView = view === "tareas";
  const isMetricsView = view === "metricas";
  const isContenidoView = view === "contenido";

  const pendingTasksCount = tasks.filter((t) => !t.hecha).length;
  const pendingContenidoCount = contenidoItems.filter(
    (i) => !i.publicado && (i.estadoFoto !== "aprobada" || i.estadoCopy !== "aprobado"),
  ).length;

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

  const markMessaged = useCallback(
    (id: string) => updateLead(id, { ultimoMensajeEn: new Date().toISOString() }),
    [updateLead],
  );

  const handleImportHistorial = async (items: Partial<Lead>[]) => {
    let updated = 0;
    const toCreate: Partial<Lead>[] = [];
    for (const item of items) {
      if (!item.telefono) continue;
      const match = leads.find((l) => l.telefono && phonesMatch(l.telefono, item.telefono!));
      if (match) {
        const merged = mergeHistorial(match.historial, item.historial ?? []);
        if (merged.length !== match.historial.length) {
          await updateLead(match.id, { historial: merged });
          updated++;
        }
      } else {
        toCreate.push(item);
      }
    }
    const created = toCreate.length > 0 ? (await addLeads(toCreate)) ?? 0 : 0;
    setSuccessMsg(
      `Historial actualizado: ${updated} lead${updated !== 1 ? "s" : ""} actualizado${updated !== 1 ? "s" : ""}, ` +
      `${created} lead${created !== 1 ? "s" : ""} nuevo${created !== 1 ? "s" : ""} creado${created !== 1 ? "s" : ""}.`,
    );
  };

  const handleDeduplicate = async () => {
    const count = countDuplicates();
    if (count === 0) { setSuccessMsg("No se encontraron duplicados."); return; }
    const s = count === 1 ? "" : "s";
    if (!window.confirm(`Se encontraron ${count} lead${s} duplicado${s}. Se fusionará su información (historial, notas, tags, etc.) en el lead más antiguo de cada grupo y se eliminarán los duplicados. ¿Continuar?`)) return;
    const deleted = await deduplicateLeads();
    if (deleted > 0) setSuccessMsg(`Se fusionaron y eliminaron ${deleted} lead${deleted === 1 ? "" : "s"} duplicado${deleted === 1 ? "" : "s"}.`);
  };

  const handleRecalcularEtapas = async () => {
    const count = leadsParaRecalcular(leads).length;
    if (count === 0) { setSuccessMsg("No hay leads para recalcular: todos los 'nuevo' están sin historial."); return; }
    const s = count === 1 ? "" : "s";
    if (!window.confirm(`${count} lead${s} en "Nuevo" ya tienen historial de conversación (o sea, ya se los contactó). Se van a mover a "Contactado" con la fecha del primer mensaje. ¿Continuar?`)) return;
    const moved = await recalcularEtapas();
    if (moved > 0) setSuccessMsg(`Se recalcularon ${moved} lead${moved === 1 ? "" : "s"}: pasaron de "Nuevo" a "Contactado".`);
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
            {leads.length > 0 && <span className="tab-badge">{leads.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "lista"}
            className={view === "lista" ? "active" : ""}
            onClick={() => handleViewChange("lista")}
          >
            Listado
            {leads.length > 0 && <span className="tab-badge">{leads.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "contactos"}
            className={view === "contactos" ? "active" : ""}
            onClick={() => handleViewChange("contactos")}
          >
            Contactos
            {contacts.length > 0 && <span className="tab-badge">{contacts.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "tareas"}
            className={view === "tareas" ? "active" : ""}
            onClick={() => handleViewChange("tareas")}
          >
            Tareas
            {pendingTasksCount > 0 && <span className="tab-badge">{pendingTasksCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "metricas"}
            className={view === "metricas" ? "active" : ""}
            onClick={() => handleViewChange("metricas")}
          >
            Métricas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "contenido"}
            className={view === "contenido" ? "active" : ""}
            onClick={() => handleViewChange("contenido")}
          >
            📅 Contenido
            {pendingContenidoCount > 0 && <span className="tab-badge">{pendingContenidoCount}</span>}
          </button>
        </div>

        {!isTasksView && !isMetricsView && !isContenidoView && (
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
                title="Detecta leads duplicados por teléfono, Instagram o email y fusiona su información en el más antiguo"
              >
                Deduplicar
              </button>
            )}

            {!isContactsView && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRecalcularEtapas}
                title="Mueve a 'Contactado' los leads 'Nuevo' que ya tienen historial de conversación"
              >
                🔄 Recalcular etapas
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setImporting(true)}
            >
              Importar
            </button>

            {!isContactsView && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCampaignOpen(true)}
                title="Leads que pidieron una sede en Capital y todavía no se les contó de San Telmo"
              >
                📍 Reconexión
              </button>
            )}

            {!isContactsView && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReporteOpen(true)}
                title="Miembros activos con su mail y datos del mes, para mandarles el reporte por mail y avisarles por WhatsApp"
              >
                📊 Reporte mensual
              </button>
            )}

            {!isContactsView && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRetargetingOpen(true)}
                title="Armá una campaña filtrando leads por etapa y antigüedad de contacto"
              >
                📢 Campaña
              </button>
            )}

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
        )}
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
        {view === "metricas" ? (
          <MetricsView leads={leads} />
        ) : view === "contenido" ? (
          <ContenidoView
            items={contenidoItems}
            loading={contenidoLoading}
            error={contenidoError}
            onUpdate={updateContenidoItem}
            onDelete={deleteContenidoItem}
          />
        ) : view === "tareas" ? (
          <TasksView
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOpenLead={openLeadById}
          />
        ) : loading && !isContactsView ? (
          <div className="app-loading">Cargando leads…</div>
        ) : view === "kanban" ? (
          <KanbanBoard
            leads={leads}
            onMove={moveLead}
            onEdit={openEdit}
            onSendWhatsapp={markMessaged}
            onTogglePriority={(id, prioridad) => updateLead(id, { prioridad })}
            tasks={tasks}
            onToggleTask={toggleTask}
            onOpenLeadById={openLeadById}
          />
        ) : view === "lista" ? (
          <ListView
          leads={leads}
          onEdit={openEdit}
          onMove={moveLead}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onSendWhatsapp={markMessaged}
          onTogglePriority={(id, prioridad) => updateLead(id, { prioridad })}
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
          onSendWhatsapp={markMessaged}
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
          leads={leads}
          onClose={() => setImporting(false)}
          onImport={(items) => addLeads(items)}
          onImportHistorial={handleImportHistorial}
        />
      )}

      {/* Reconnection campaign modal */}
      {campaignOpen && (
        <CampaignModal
          leads={leads}
          onClose={() => setCampaignOpen(false)}
          onApplyTag={(id, tags) => updateLead(id, { tags })}
          onSendWhatsapp={markMessaged}
        />
      )}

      {/* Monthly report modal */}
      {reporteOpen && (
        <ReporteMensualModal
          leads={leads}
          onClose={() => setReporteOpen(false)}
          onUpdateLead={updateLead}
          onSendWhatsapp={markMessaged}
        />
      )}

      {/* Retargeting campaign modal */}
      {retargetingOpen && (
        <RetargetingModal
          leads={leads}
          onClose={() => setRetargetingOpen(false)}
          onApplyTag={(id, tags) => updateLead(id, { tags })}
          onSendWhatsapp={markMessaged}
        />
      )}
    </div>
  );
}
