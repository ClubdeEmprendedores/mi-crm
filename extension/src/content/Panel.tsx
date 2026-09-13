import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { last10 } from "./phone";
import {
  getEstadoConversacion,
  getUltimoContacto,
  ESTADO_CONVERSACION_LABELS,
  ESTADO_CONVERSACION_COLORS,
} from "../../../src/utils/conversacion";
import { mensajePorEstadoConversacion } from "../../../src/utils/whatsapp";
import type { HistorialEntry } from "../../../src/types";
import { useDraggable } from "./useDraggable";

type PanelLead = {
  id: string;
  nombre: string;
  etapa: string;
  telefono: string;
  tags: string[];
  notas: string;
  historial: HistorialEntry[];
  ultimoMensajeEn?: string;
};

type DbRow = {
  id: string;
  nombre: string;
  etapa: string;
  telefono: string;
  tags: string[] | null;
  notas: string | null;
  historial: HistorialEntry[] | null;
  ultimo_mensaje_en: string | null;
};

function fromDbRow(row: DbRow): PanelLead {
  return {
    id: row.id,
    nombre: row.nombre ?? "",
    etapa: row.etapa ?? "nuevo",
    telefono: row.telefono ?? "",
    tags: row.tags ?? [],
    notas: row.notas ?? "",
    historial: row.historial ?? [],
    ultimoMensajeEn: row.ultimo_mensaje_en ?? undefined,
  };
}

const REMINDER_CHIPS: Array<{ label: string; ms: number }> = [
  { label: "5 min", ms: 5 * 60 * 1000 },
  { label: "1 hora", ms: 60 * 60 * 1000 },
  { label: "Mañana 9am", ms: -1 }, // caso especial, calculado aparte
  { label: "1 semana", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "1 mes", ms: 30 * 24 * 60 * 60 * 1000 },
];

function proximaFecha(ms: number): Date {
  if (ms === -1) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return new Date(Date.now() + ms);
}

export function Panel({ headerText }: { headerText: string | null }) {
  const [lead, setLead] = useState<PanelLead | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [notas, setNotas] = useState("");
  const [nuevoTag, setNuevoTag] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [recordatorioOk, setRecordatorioOk] = useState<string | null>(null);
  const [colapsado, setColapsado] = useState(false);
  const { offset, onMouseDown } = useDraggable("mcw-panel-pos");
  const panelStyle = { transform: `translate(${offset.x}px, ${offset.y}px)` };

  useEffect(() => {
    chrome.storage.local.get("mcw-panel-colapsado").then((stored) => {
      if (typeof stored["mcw-panel-colapsado"] === "boolean") {
        setColapsado(stored["mcw-panel-colapsado"]);
      }
    });
  }, []);

  const toggleColapsado = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setColapsado((prev) => {
      const next = !prev;
      chrome.storage.local.set({ "mcw-panel-colapsado": next });
      return next;
    });
  }, []);

  const toggleBtn = (
    <button
      className="mcw-toggle-btn"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={toggleColapsado}
      title={colapsado ? "Expandir panel" : "Colapsar panel"}
    >
      {colapsado ? "▸" : "▾"}
    </button>
  );

  const phoneMatch = headerText?.match(/\+\d[\d\s-]{8,}\d/) ?? null;
  const telefonoRaw = phoneMatch ? phoneMatch[0] : null;

  useEffect(() => {
    let cancelled = false;
    setLead(null);
    setNotFound(false);
    if (!telefonoRaw) return;

    setLoading(true);
    const key = last10(telefonoRaw);
    supabase
      .from("leads")
      .select("id,nombre,etapa,telefono,tags,notas,historial,ultimo_mensaje_en")
      .ilike("telefono", `%${key}%`)
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !data || data.length === 0) {
          setNotFound(true);
          return;
        }
        const found = fromDbRow(data[0] as DbRow);
        setLead(found);
        setNotas(found.notas);
      });

    return () => {
      cancelled = true;
    };
  }, [telefonoRaw]);

  // Sync en tiempo real: si el lead se edita desde el CRM web (u otra pestaña),
  // reflejarlo acá sin recargar.
  useEffect(() => {
    if (!lead?.id) return;
    const channel = supabase
      .channel(`mcw-lead-${lead.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${lead.id}` },
        (payload) => {
          const updated = fromDbRow(payload.new as DbRow);
          setLead(updated);
          setNotas((prev) => (document.activeElement?.tagName === "TEXTAREA" ? prev : updated.notas));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const guardarNotas = useCallback(async () => {
    if (!lead) return;
    await supabase.from("leads").update({ notas }).eq("id", lead.id);
  }, [lead, notas]);

  const agregarTag = useCallback(async () => {
    if (!lead || !nuevoTag.trim()) return;
    const tags = [...lead.tags, nuevoTag.trim()];
    const { error } = await supabase.from("leads").update({ tags }).eq("id", lead.id);
    if (!error) {
      setLead({ ...lead, tags });
      setNuevoTag("");
    }
  }, [lead, nuevoTag]);

  const copiarPlantilla = useCallback(() => {
    if (!lead) return;
    const estado = getEstadoConversacion(lead);
    const texto = mensajePorEstadoConversacion(lead.nombre || "", estado);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }, [lead]);

  const marcarNoInteresado = useCallback(async () => {
    if (!lead) return;
    const motivo = window.prompt("¿Por qué no está interesado? (se guarda en las notas)", "");
    if (motivo === null) return;
    const notasNuevas = motivo.trim()
      ? `${lead.notas ? lead.notas + "\n" : ""}❌ No interesado: ${motivo.trim()}`
      : lead.notas;
    const { error } = await supabase
      .from("leads")
      .update({ etapa: "perdido", notas: notasNuevas })
      .eq("id", lead.id);
    if (!error) {
      setLead({ ...lead, etapa: "perdido", notas: notasNuevas });
      setNotas(notasNuevas);
    }
  }, [lead]);

  const crearRecordatorio = useCallback(
    async (ms: number, label: string) => {
      if (!lead) return;
      const fecha = proximaFecha(ms);
      const { error } = await supabase.from("tasks").insert({
        texto: `Seguimiento: ${lead.nombre || lead.telefono}`,
        hecha: false,
        lead_id: lead.id,
        fecha_vencimiento: fecha.toISOString(),
        notificado: false,
      });
      if (!error) {
        setRecordatorioOk(label);
        setTimeout(() => setRecordatorioOk(null), 2500);
      }
    },
    [lead],
  );

  if (!telefonoRaw) {
    return (
      <div className="mcw-panel" style={panelStyle}>
        <div className="mcw-header mcw-drag-handle" onMouseDown={onMouseDown}>
          <strong>⠿ CRM</strong>
          {toggleBtn}
        </div>
        {!colapsado && (
          <div className="mcw-empty">
            Este contacto está guardado con nombre — todavía no puedo detectar
            el número automáticamente acá. Abrí un chat con un número sin
            guardar para ver el panel.
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mcw-panel" style={panelStyle}>
        <div className="mcw-header mcw-drag-handle" onMouseDown={onMouseDown}>
          <strong>⠿ CRM</strong>
          {toggleBtn}
        </div>
        {!colapsado && <div className="mcw-empty">Buscando en el CRM…</div>}
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="mcw-panel" style={panelStyle}>
        <div className="mcw-header mcw-drag-handle" onMouseDown={onMouseDown}>
          <strong>⠿ CRM</strong>
          {toggleBtn}
        </div>
        {!colapsado && (
          <div className="mcw-empty">
            {telefonoRaw} no está en el CRM todavía.
          </div>
        )}
      </div>
    );
  }

  const estado = getEstadoConversacion(lead);
  const ultimo = getUltimoContacto(lead);

  return (
    <div className="mcw-panel" style={panelStyle}>
      <div className="mcw-header mcw-drag-handle" onMouseDown={onMouseDown}>
        <strong>⠿ {lead.nombre || lead.telefono}</strong>
        <span className="mcw-row" style={{ gap: 6 }}>
          <span className="mcw-etapa">{lead.etapa}</span>
          {toggleBtn}
        </span>
      </div>

      {!colapsado && (
        <>
          <div
            className="mcw-estado"
            style={{ background: ESTADO_CONVERSACION_COLORS[estado] }}
          >
            {ESTADO_CONVERSACION_LABELS[estado]}
          </div>

          {ultimo && (
            <div className="mcw-ultimo">
              Último contacto: {new Date(ultimo.fecha).toLocaleString("es-AR")}
            </div>
          )}

          <div className="mcw-section">
            <div className="mcw-section-title">Etiquetas</div>
            <div className="mcw-tags">
              {lead.tags.map((t) => (
                <span key={t} className="mcw-tag">
                  {t}
                </span>
              ))}
            </div>
            <div className="mcw-row">
              <input
                className="mcw-input"
                placeholder="Nueva etiqueta"
                value={nuevoTag}
                onChange={(e) => setNuevoTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarTag()}
              />
              <button className="mcw-btn" onClick={agregarTag}>
                + Tag
              </button>
            </div>
          </div>

          <div className="mcw-section">
            <div className="mcw-section-title">Notas</div>
            <textarea
              className="mcw-textarea"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={guardarNotas}
              rows={3}
            />
          </div>

          <div className="mcw-section">
            <div className="mcw-section-title">Recordarme</div>
            <div className="mcw-row mcw-wrap">
              {REMINDER_CHIPS.map((c) => (
                <button
                  key={c.label}
                  className="mcw-chip"
                  onClick={() => crearRecordatorio(c.ms, c.label)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {recordatorioOk && (
              <div className="mcw-ok">Recordatorio creado ({recordatorioOk})</div>
            )}
          </div>

          <div className="mcw-section">
            <button className="mcw-btn mcw-btn-primary" onClick={copiarPlantilla}>
              {copiado ? "¡Copiado!" : "📋 Copiar plantilla sugerida"}
            </button>
            {lead.etapa !== "perdido" && lead.etapa !== "ganado" && (
              <button className="mcw-btn mcw-btn-danger" onClick={marcarNoInteresado}>
                🚫 No interesado
              </button>
            )}
          </div>

          <div className="mcw-section">
            <div className="mcw-section-title">Historial ({lead.historial.length})</div>
            <div className="mcw-historial">
              {[...lead.historial]
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .slice(0, 20)
                .map((h, i) => (
                  <div key={i} className="mcw-historial-item">
                    <span className="mcw-historial-fecha">
                      {new Date(h.fecha).toLocaleDateString("es-AR")}
                    </span>
                    <span>{h.nota}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
