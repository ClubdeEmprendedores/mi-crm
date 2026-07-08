import { useState } from "react";
import type { ContenidoItem, ContenidoSede } from "../types";
import {
  CONTENIDO_SEDE_LABELS,
  CONTENIDO_TIPO_LABELS,
  ESTADO_COPY_COLORS,
  ESTADO_COPY_LABELS,
  ESTADO_FOTO_COLORS,
  ESTADO_FOTO_LABELS,
} from "../types";
import { ContenidoModal } from "./ContenidoModal";

type Props = {
  items: ContenidoItem[];
  loading: boolean;
  error: string | null;
  onUpdate: (id: string, patch: Partial<ContenidoItem>) => void;
  onDelete: (id: string) => void;
};

function parseFechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatFecha(fecha: string) {
  return parseFechaLocal(fecha).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function isAtrasado(item: ContenidoItem) {
  if (item.publicado) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return parseFechaLocal(item.fecha) < hoy;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="contenido-badge" style={{ background: `${color}26`, color, border: `1px solid ${color}55` }}>
      {label}
    </span>
  );
}

export function ContenidoView({ items, loading, error, onUpdate, onDelete }: Props) {
  const now = new Date();
  const [mes, setMes] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [sede, setSede] = useState<ContenidoSede | "todas">("todas");
  const [viewing, setViewing] = useState<ContenidoItem | null>(null);

  if (loading) {
    return <div className="app-loading">Cargando calendario de contenido…</div>;
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
          <h3>Tabla de calendario de contenido no encontrada</h3>
          <p>Para activar esta función, corré el siguiente SQL en tu proyecto de Supabase:</p>
          <pre className="contacts-migration-sql">{`-- En Supabase → SQL Editor:
CREATE TABLE contenido_calendario (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha          DATE NOT NULL,
  sede           TEXT NOT NULL,
  etiqueta       TEXT NOT NULL DEFAULT '',
  tipo           TEXT NOT NULL DEFAULT 'post',
  estado_foto    TEXT NOT NULL DEFAULT 'pendiente',
  estado_copy    TEXT NOT NULL DEFAULT 'pendiente',
  publicado      BOOLEAN NOT NULL DEFAULT FALSE,
  image_url      TEXT,
  caption        TEXT,
  notas          TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contenido_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contenido_calendario_all" ON contenido_calendario
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
          {!needsMigration && (
            <p className="contacts-migration-error">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  const filtrados = items.filter((i) => {
    if (sede !== "todas" && i.sede !== sede) return false;
    return i.fecha.startsWith(mes);
  });

  const pendientesFoto = filtrados.filter((i) => i.estadoFoto !== "aprobada").length;
  const pendientesCopy = filtrados.filter((i) => i.estadoCopy !== "aprobado").length;
  const publicados = filtrados.filter((i) => i.publicado).length;
  const atrasados = filtrados.filter(isAtrasado).length;

  const meses = Array.from(new Set(items.map((i) => i.fecha.slice(0, 7)))).sort();
  if (!meses.includes(mes)) meses.push(mes);
  meses.sort();

  return (
    <div className="contenido-wrap">
      <div className="contenido-filters">
        <select value={mes} onChange={(e) => setMes(e.target.value)} className="contenido-select">
          {meses.map((m) => (
            <option key={m} value={m}>
              {parseFechaLocal(`${m}-01`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        <select value={sede} onChange={(e) => setSede(e.target.value as ContenidoSede | "todas")} className="contenido-select">
          <option value="todas">Todas las sedes</option>
          <option value="sanfernando">San Fernando</option>
          <option value="santelmo">San Telmo</option>
        </select>
      </div>

      <div className="contenido-summary">
        <div className="contenido-summary-item">
          <span className="contenido-summary-num">{filtrados.length}</span>
          <span>en el mes</span>
        </div>
        <div className="contenido-summary-item">
          <span className="contenido-summary-num" style={{ color: pendientesFoto > 0 ? "#FFC933" : "#2fbf5f" }}>{pendientesFoto}</span>
          <span>sin foto aprobada</span>
        </div>
        <div className="contenido-summary-item">
          <span className="contenido-summary-num" style={{ color: pendientesCopy > 0 ? "#FFC933" : "#2fbf5f" }}>{pendientesCopy}</span>
          <span>sin copy aprobado</span>
        </div>
        <div className="contenido-summary-item">
          <span className="contenido-summary-num" style={{ color: "#2fbf5f" }}>{publicados}</span>
          <span>publicados</span>
        </div>
        {atrasados > 0 && (
          <div className="contenido-summary-item">
            <span className="contenido-summary-num" style={{ color: "#f87171" }}>{atrasados}</span>
            <span>atrasados</span>
          </div>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="list-empty">
          <p>No hay contenido cargado para este mes.</p>
        </div>
      ) : (
        <div className="contenido-table-wrap">
          <table className="contenido-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sede</th>
                <th>Contenido</th>
                <th>Tipo</th>
                <th>Foto</th>
                <th>Copy</th>
                <th>Publicado</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr
                  key={item.id}
                  className={isAtrasado(item) ? "contenido-row--atrasado" : ""}
                  onClick={() => setViewing(item)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{formatFecha(item.fecha)}</td>
                  <td>{CONTENIDO_SEDE_LABELS[item.sede]}</td>
                  <td>
                    {item.etiqueta}
                    {item.caption && <span className="contenido-has-copy" title="Tiene copy cargado"> 📝</span>}
                  </td>
                  <td>{CONTENIDO_TIPO_LABELS[item.tipo]}</td>
                  <td>
                    <Badge label={ESTADO_FOTO_LABELS[item.estadoFoto]} color={ESTADO_FOTO_COLORS[item.estadoFoto]} />
                  </td>
                  <td>
                    <Badge label={ESTADO_COPY_LABELS[item.estadoCopy]} color={ESTADO_COPY_COLORS[item.estadoCopy]} />
                  </td>
                  <td>
                    <Badge
                      label={item.publicado ? "Publicado" : "Pendiente"}
                      color={item.publicado ? "#2fbf5f" : "#8b95a5"}
                    />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="contenido-approve-btn"
                      onClick={() => setViewing(item)}
                    >
                      👁 Ver
                    </button>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="tasks-item-delete"
                      onClick={() => onDelete(item.id)}
                      aria-label="Eliminar"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <ContenidoModal
          item={viewing}
          onClose={() => setViewing(null)}
          onSave={(id, patch) => onUpdate(id, patch)}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
