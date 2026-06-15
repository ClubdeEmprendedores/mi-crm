import { useRef, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import type { Lead } from "../types";
import { parseExcelFile } from "../utils/parseExcel";
import { parseVCard } from "../utils/parseVCard";
import { parseWhatsAppChat } from "../utils/parseWhatsAppChat";
import { parseInstagramDMs } from "../utils/parseInstagramDMs";
import { parseWhatsAppExport } from "../utils/parseWhatsAppExport";
import { parseWhatsAppHistorial } from "../utils/parseWhatsAppHistorial";
import { phonesMatch } from "../utils/phone";

type Tab = "excel" | "vcf" | "chat" | "instagram" | "whatsapp" | "historial";

interface ParsedRow extends Partial<Lead> {
  _id: string;
  _sel: boolean;
}

interface Props {
  leads: Lead[];
  onClose: () => void;
  onImport: (contacts: Partial<Lead>[]) => void;
  onImportHistorial: (items: Partial<Lead>[]) => void;
}

const ACCEPT: Record<Tab, string> = {
  excel: ".xlsx,.xls,.csv",
  vcf: ".vcf",
  chat: ".txt",
  instagram: ".json",
  whatsapp: ".json",
  historial: ".json",
};

const TAB_LABEL: Record<Tab, string> = {
  excel: "Excel / CSV",
  vcf: "Contactos (.vcf)",
  chat: "Chat WhatsApp (.txt)",
  instagram: "Instagram DMs (.json)",
  whatsapp: "WhatsApp (reconexión)",
  historial: "Historial WhatsApp",
};

export function ImportModal({ leads, onClose, onImport, onImportHistorial }: Props) {
  useEscapeKey(onClose);

  const [tab, setTab] = useState<Tab>("excel");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setError("");
  };

  const parse = async (files: File[]) => {
    setError("");
    setRows([]);
    setLoading(true);
    try {
      let parsed: Partial<Lead>[] = [];

      if (tab === "instagram") {
        const texts = await Promise.all(files.map((f) => f.text()));
        parsed = parseInstagramDMs(texts);
      } else {
        const file = files[0];
        if (!file) return;
        if (tab === "excel") parsed = await parseExcelFile(file);
        else if (tab === "vcf") parsed = parseVCard(await file.text());
        else if (tab === "whatsapp") parsed = parseWhatsAppExport(await file.text());
        else if (tab === "historial") parsed = parseWhatsAppHistorial(await file.text());
        else parsed = parseWhatsAppChat(await file.text());
      }

      if (parsed.length === 0) {
        setError("No se encontraron contactos en el archivo.");
      } else {
        setRows(
          parsed.map((c, i) => ({ ...c, _id: String(i), _sel: true }))
        );
      }
    } catch {
      setError("Error al leer el archivo. Verificá el formato.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      tab === "instagram" ? f.name.endsWith(".json") : true
    );
    if (files.length > 0) parse(files);
  };

  const toggleAll = (val: boolean) =>
    setRows((r) => r.map((x) => ({ ...x, _sel: val })));

  const toggle = (id: string) =>
    setRows((r) =>
      r.map((x) => (x._id === id ? { ...x, _sel: !x._sel } : x))
    );

  const selected = rows.filter((r) => r._sel);

  const doImport = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const items = selected.map(({ _id: _i, _sel: _s, ...rest }) => rest);
    if (tab === "historial") onImportHistorial(items);
    else onImport(items);
    onClose();
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

  const isMulti = tab === "instagram";

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal import-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="import-title"
      >
        <header className="modal-header">
          <h2 id="import-title">Importar contactos</h2>
          <div className="modal-header-actions">
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        <div className="import-tabs">
          {(Object.keys(ACCEPT) as Tab[]).map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => switchTab(t)}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {tab === "instagram" && rows.length === 0 && !loading && (
          <div className="import-ig-guide">
            <strong>Cómo exportar tus DMs de Instagram:</strong>
            <ol>
              <li>Instagram → Configuración → Tu actividad → Descargar tu información</li>
              <li>Seleccioná <em>Mensajes</em>, formato <strong>JSON</strong>, y pedí la descarga</li>
              <li>Cuando llegue el ZIP, abrilo y navegá a <code>messages/inbox/</code></li>
              <li>Seleccioná <strong>todos los archivos .json</strong> de esa carpeta y arrastralos acá</li>
            </ol>
          </div>
        )}

        {tab === "whatsapp" && rows.length === 0 && !loading && (
          <div className="import-ig-guide">
            <strong>Conversaciones de WhatsApp que no avanzaron:</strong>
            <ol>
              <li>Con el bridge de WhatsApp corriendo, ejecutá <code>export_leads.py</code> en <code>whatsapp-bridge/</code></li>
              <li>Esto genera <code>whatsapp_leads.json</code> con los chats 1 a 1 (sin staff ni equipo CdE)</li>
              <li>Arrastrá ese archivo acá — quedan ordenados del más viejo al más reciente</li>
            </ol>
          </div>
        )}

        {tab === "historial" && rows.length === 0 && !loading && (
          <div className="import-ig-guide">
            <strong>Actualizar historial de conversaciones de WhatsApp:</strong>
            <ol>
              <li>Con el bridge de WhatsApp corriendo, ejecutá <code>export_historial.py</code> en <code>whatsapp-bridge/</code></li>
              <li>Esto genera <code>whatsapp_historial.json</code> con los últimos mensajes de cada chat 1 a 1</li>
              <li>Arrastrá ese archivo acá: los leads existentes se actualizan (sumando el historial sin duplicar) y los contactos nuevos se crean en "Nuevo"</li>
            </ol>
          </div>
        )}

        {rows.length === 0 && !loading && (
          <div
            className={`import-dropzone${dragging ? " dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="import-dropzone-icon">↑</div>
            <p>
              {isMulti
                ? "Arrastrá todos los archivos .json acá o "
                : "Arrastrá el archivo acá o "}
              <strong>hacé click para buscar</strong>
            </p>
            <p className="import-hint">
              {isMulti ? "Podés seleccionar múltiples archivos a la vez" : ACCEPT[tab]}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT[tab]}
              multiple={isMulti}
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) parse(files);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {loading && (
          <p className="import-hint" style={{ textAlign: "center", padding: "2rem" }}>
            Procesando archivo{isMulti ? "s" : ""}…
          </p>
        )}

        {error && <p className="import-error">{error}</p>}

        {rows.length > 0 && (
          <>
            <div className="import-preview-bar">
              <span>
                {rows.length} contacto{rows.length !== 1 ? "s" : ""}{" "}
                encontrado{rows.length !== 1 ? "s" : ""}
              </span>
              <div className="import-preview-actions">
                <button onClick={() => toggleAll(true)}>Todos</button>
                <button onClick={() => toggleAll(false)}>Ninguno</button>
                <button onClick={reset}>Cambiar archivo</button>
              </div>
            </div>

            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th />
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    {tab === "historial" ? (
                      <>
                        <th>Mensajes</th>
                        <th>Estado</th>
                      </>
                    ) : tab === "whatsapp" ? <th>Notas</th> : (
                      <>
                        <th>Email</th>
                        <th>Instagram</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._id}
                      className={row._sel ? "" : "import-row-off"}
                      onClick={() => toggle(row._id)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={row._sel}
                          onChange={() => toggle(row._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{row.nombre || <span className="import-empty">—</span>}</td>
                      <td>{row.telefono || <span className="import-empty">—</span>}</td>
                      {tab === "historial" ? (
                        <>
                          <td>{row.historial?.length ?? 0}</td>
                          <td>
                            {row.telefono && leads.some((l) => l.telefono && phonesMatch(l.telefono, row.telefono!))
                              ? "Lead existente"
                              : "Lead nuevo"}
                          </td>
                        </>
                      ) : tab === "whatsapp" ? (
                        <td className="import-notas">{row.notas || <span className="import-empty">—</span>}</td>
                      ) : (
                        <>
                          <td>{row.email || <span className="import-empty">—</span>}</td>
                          <td>
                            {row.instagram
                              ? <span style={{ color: "#e1306c" }}>@{row.instagram}</span>
                              : <span className="import-empty">—</span>}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={selected.length === 0}
                onClick={doImport}
              >
                {tab === "historial"
                  ? `Actualizar ${selected.length} lead${selected.length !== 1 ? "s" : ""}`
                  : `Importar ${selected.length} contacto${selected.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
