import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { borrarLeadCompleto } from "../lib/borrarLead";
import { last10 } from "./phone";
import {
  getEstadoConversacion,
  getUltimoContacto,
  ESTADO_CONVERSACION_LABELS,
  ESTADO_CONVERSACION_COLORS,
} from "../../../src/utils/conversacion";
import { mensajePlanesClub, mensajePorEstadoConversacion } from "../../../src/utils/whatsapp";
import type { HistorialEntry, Rubro, SedeOption } from "../../../src/types";
import { useDraggable } from "./useDraggable";
import { AltaGrupo } from "./AltaGrupo";

type PanelLead = {
  id: string;
  nombre: string;
  etapa: string;
  telefono: string;
  tags: string[];
  notas: string;
  historial: HistorialEntry[];
  ultimoMensajeEn?: string;
  empresa: string;
  email: string;
  instagram: string;
  rubro: Rubro | null;
  sede: SedeOption | null;
};

const LEAD_COLUMNS = "id,nombre,etapa,telefono,tags,notas,historial,ultimo_mensaje_en,empresa,email,instagram,rubro,sede";

type DbRow = {
  id: string;
  nombre: string;
  etapa: string;
  telefono: string;
  tags: string[] | null;
  notas: string | null;
  historial: HistorialEntry[] | null;
  ultimo_mensaje_en: string | null;
  empresa: string | null;
  email: string | null;
  instagram: string | null;
  rubro: Rubro | null;
  sede: SedeOption | null;
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
    empresa: row.empresa ?? "",
    email: row.email ?? "",
    instagram: row.instagram ?? "",
    rubro: row.rubro ?? null,
    sede: row.sede ?? null,
  };
}

/** Nombre del chat abierto (primera línea del header), para buscar contactos agendados. */
function nombreDelChat(headerText: string | null): string {
  return (headerText ?? "").split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
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
  const [planesCopiado, setPlanesCopiado] = useState(false);
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
  // El header también muestra "en línea" / "escribiendo…", que cambia todo el
  // tiempo: el panel se reinicia solo cuando cambia el chat (su nombre).
  const chatNombre = nombreDelChat(headerText);

  useEffect(() => {
    let cancelled = false;
    setLead(null);
    setNotFound(false);
    if (!telefonoRaw) return;

    setLoading(true);
    const key = last10(telefonoRaw);
    supabase
      .from("leads")
      .select(LEAD_COLUMNS)
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
  }, [telefonoRaw, chatNombre]);

  // Contactos agendados: WhatsApp no muestra el número, así que se busca el
  // lead a mano (por nombre, teléfono o Instagram), arrancando por el nombre del chat.
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<PanelLead[]>([]);
  useEffect(() => {
    setBusqueda(telefonoRaw ? "" : chatNombre);
    setResultados([]);
  }, [chatNombre, telefonoRaw]);

  const buscar = useCallback(async () => {
    // Comas y paréntesis rompen el filtro .or() de Supabase.
    const q = busqueda.trim().replace(/^@/, "").replace(/[,()]/g, " ").trim();
    if (q.length < 2) return;
    const digitos = q.replace(/\D/g, "");
    const filtros = [`nombre.ilike.%${q}%`, `empresa.ilike.%${q}%`, `instagram.ilike.%${q}%`];
    if (digitos.length >= 6) filtros.push(`telefono.ilike.%${digitos.slice(-10)}%`);
    const { data } = await supabase.from("leads").select(LEAD_COLUMNS).or(filtros.join(",")).limit(6);
    setResultados(((data as DbRow[] | null) ?? []).map(fromDbRow));
  }, [busqueda]);

  const elegirLead = useCallback((l: PanelLead) => {
    setLead(l);
    setNotas(l.notas);
    setNotFound(false);
    setResultados([]);
  }, []);

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

  const copiarPlanes = useCallback(() => {
    if (!lead) return;
    navigator.clipboard.writeText(mensajePlanesClub(lead.nombre || "")).then(() => {
      setPlanesCopiado(true);
      setTimeout(() => setPlanesCopiado(false), 2000);
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

  const borrarContacto = useCallback(async () => {
    if (!lead) return;
    const borrado = await borrarLeadCompleto(lead);
    if (!borrado) return;
    setLead(null);
    setNotFound(true);
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

  const buscador = (
    <div className="mcw-section">
      <div className="mcw-section-title">Buscar en el CRM</div>
      <div className="mcw-row">
        <input
          className="mcw-input"
          placeholder="Nombre, teléfono o Instagram"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
        />
        <button className="mcw-btn" onClick={buscar}>
          Buscar
        </button>
      </div>
      {resultados.map((r) => (
        <button key={r.id} className="mcw-resultado" onClick={() => elegirLead(r)}>
          <strong>{r.nombre || r.empresa || r.telefono}</strong>
          <span>
            {r.telefono} · {r.etapa}
            {r.instagram ? ` · @${r.instagram}` : ""}
          </span>
        </button>
      ))}
    </div>
  );

  if (!telefonoRaw && !lead) {
    return (
      <div className="mcw-panel" style={panelStyle}>
        <div className="mcw-header mcw-drag-handle" onMouseDown={onMouseDown}>
          <strong>⠿ CRM</strong>
          {toggleBtn}
        </div>
        {!colapsado && (
          <>
            <div className="mcw-empty">Contacto agendado: buscalo en el CRM para ver su ficha.</div>
            {buscador}
          </>
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
          <>
            <div className="mcw-empty">{telefonoRaw} no está en el CRM con ese número.</div>
            {buscador}
          </>
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

          {lead.etapa !== "proveedor" && lead.etapa !== "perdido" && lead.etapa !== "exmiembro" && (
            <div className="mcw-section">
              <AltaGrupo key={lead.id} lead={lead} onActualizado={() => undefined} />
            </div>
          )}

          <div className="mcw-section">
            <button className="mcw-btn mcw-btn-primary" onClick={copiarPlantilla}>
              {copiado ? "¡Copiado!" : "📋 Copiar plantilla sugerida"}
            </button>
            {lead.etapa !== "ganado" && lead.etapa !== "proveedor" && (
              <button className="mcw-btn" style={{ width: "100%", marginTop: 6 }} onClick={copiarPlanes}>
                {planesCopiado ? "¡Copiado!" : "🐝 Copiar planes del Club"}
              </button>
            )}
            {lead.etapa !== "perdido" && lead.etapa !== "ganado" && (
              <button className="mcw-btn mcw-btn-danger" onClick={marcarNoInteresado}>
                🚫 No interesado
              </button>
            )}
            <button className="mcw-btn mcw-btn-danger" onClick={borrarContacto}>
              🗑 Borrar contacto del CRM
            </button>
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
