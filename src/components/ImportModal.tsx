import { useRef, useState } from "react";
import type { Lead } from "../types";
import { parseExcelFile } from "../utils/parseExcel";
import { parseVCard } from "../utils/parseVCard";
import { parseWhatsAppChat } from "../utils/parseWhatsAppChat";

type Tab = "excel" | "vcf" | "chat";

interface ParsedRow extends Partial<Lead> {
  _id: string;
  _sel: boolean;
}

interface Props {
  onClose: () => void;
  onImport: (contacts: Partial<Lead>[]) => void;
}

const ACCEPT: Record<Tab, string> = {
  excel: ".xlsx,.xls,.csv",
  vcf: ".vcf",
  chat: ".txt",
};

const TAB_LABEL: Record<Tab, string> = {
  excel: "Excel / CSV",
  vcf: "Contactos (.vcf)",
  chat: "Chat WhatsApp (.txt)",
};

export function ImportModal({ onClose, onImport }: Props) {
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

  const parse = async (file: File) => {
    setError("");
    setRows([]);
    setLoading(true);
    try {
      let parsed: Partial<Lead>[] = [];
      if (tab === "excel") parsed = await parseExcelFile(file);
      else if (tab === "vcf") parsed = parseVCard(await file.text());
      else parsed = parseWhatsAppChat(await file.text());

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
    const file = e.dataTransfer.files[0];
    if (file) parse(file);
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
    onImport(selected.map(({ _id: _i, _sel: _s, ...rest }) => rest));
    onClose();
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

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
              Arrastrá el archivo acá o{" "}
              <strong>hacé click para buscar</strong>
            </p>
            <p className="import-hint">{ACCEPT[tab]}</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT[tab]}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parse(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {loading && <p className="import-hint" style={{ textAlign: "center", padding: "2rem" }}>Procesando archivo…</p>}

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
                    <th>Email</th>
                    <th>Empresa</th>
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
                      <td>{row.email || <span className="import-empty">—</span>}</td>
                      <td>{row.empresa || <span className="import-empty">—</span>}</td>
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
                Importar {selected.length} contacto
                {selected.length !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
