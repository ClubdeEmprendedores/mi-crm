import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getEstadoConversacion } from "../../../src/utils/conversacion";
import { mensajePorEstadoConversacion } from "../../../src/utils/whatsapp";
import type { HistorialEntry } from "../../../src/types";
import { useDraggable } from "./useDraggable";

export const RECONTACTO_QUEUE_TAG = "🎯 Recontacto sept-2026";

type QueueLead = {
  id: string;
  nombre: string;
  telefono: string;
  tags: string[];
  historial: HistorialEntry[] | null;
  ultimo_mensaje_en: string | null;
  mensaje_recontacto: string | null;
};

export function QueueBar({ currentPhone }: { currentPhone: string | null }) {
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { offset, onMouseDown } = useDraggable("mcw-queuebar-pos");

  const refreshCount = useCallback(async () => {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .contains("tags", [RECONTACTO_QUEUE_TAG]);
    setTotal(count ?? 0);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount, currentPhone]);

  const [siguienteInfo, setSiguienteInfo] = useState<{ id: string; nombre: string; telefono: string; mensaje: string } | null>(null);
  const [copiado, setCopiado] = useState<"numero" | "mensaje" | null>(null);

  const copiar = useCallback((texto: string, cual: "numero" | "mensaje") => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(cual);
      setTimeout(() => setCopiado(null), 2000);
    });
  }, []);

  const abrirSiguiente = useCallback(async () => {
    setStatus("Buscando...");
    const { data, error } = await supabase
      .from("leads")
      .select("id,nombre,telefono,tags,historial,ultimo_mensaje_en,mensaje_recontacto")
      .contains("tags", [RECONTACTO_QUEUE_TAG])
      .order("id")
      .limit(1);

    if (error) {
      setStatus("Error buscando la cola");
      return;
    }
    const siguiente = (data as QueueLead[] | null)?.[0];
    if (!siguiente) {
      setStatus("¡Cola vacía! No quedan pendientes.");
      setSiguienteInfo(null);
      return;
    }

    // Preferir el mensaje escrito a mano segun el contexto real de la
    // conversacion; la plantilla generica es solo un fallback si todavia
    // no se redacto uno para este lead.
    let texto = siguiente.mensaje_recontacto;
    if (!texto) {
      const estado = getEstadoConversacion({
        historial: siguiente.historial ?? [],
        ultimoMensajeEn: siguiente.ultimo_mensaje_en ?? undefined,
      });
      texto = mensajePorEstadoConversacion(siguiente.nombre || "", estado);
    }

    await navigator.clipboard.writeText(texto);
    setCopiado("mensaje");
    setSiguienteInfo({
      id: siguiente.id,
      nombre: siguiente.nombre || siguiente.telefono,
      telefono: siguiente.telefono,
      mensaje: texto,
    });
    setStatus("Mensaje copiado — buscalo en la lista de WhatsApp y pegalo");
  }, []);

  // Usa el id del lead que ya tenemos guardado de cuando lo buscamos (no
  // depende de detectar el telefono del chat abierto -- eso falla en
  // contactos guardados con nombre, como se vio en la practica).
  const marcarEnviado = useCallback(async () => {
    if (!siguienteInfo) return;
    setStatus("Marcando...");
    const { data } = await supabase
      .from("leads")
      .select("tags,recontactos_enviados")
      .eq("id", siguienteInfo.id)
      .single();
    const tags = ((data?.tags as string[] | undefined) ?? []).filter((t) => t !== RECONTACTO_QUEUE_TAG);
    const recontactosEnviados = [
      { fecha: new Date().toISOString(), mensaje: siguienteInfo.mensaje },
      ...((data?.recontactos_enviados as { fecha: string; mensaje: string }[] | undefined) ?? []),
    ];
    await supabase.from("leads").update({ tags, recontactos_enviados: recontactosEnviados }).eq("id", siguienteInfo.id);
    setStatus(`✓ ${siguienteInfo.nombre} sacado de la cola`);
    setSiguienteInfo(null);
    refreshCount();
  }, [siguienteInfo, refreshCount]);

  if (total === null) return null;

  return (
    <div
      className="mcw-queuebar"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="mcw-drag-handle" onMouseDown={onMouseDown}>
        <span>⠿ 🎯 Cola de recontacto: {total} pendientes</span>
      </div>
      {siguienteInfo && (
        <div className="mcw-queuebar-target">
          <div>
            1) Buscá: <strong>{siguienteInfo.nombre}</strong> — Tel:{" "}
            <strong>{siguienteInfo.telefono}</strong>{" "}
            <button
              className="mcw-copy-btn"
              onClick={() => copiar(siguienteInfo.telefono, "numero")}
            >
              {copiado === "numero" ? "¡Copiado!" : "📋 Copiar número"}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>2) Este es el mensaje (ya está copiado):</div>
          <textarea
            className="mcw-textarea"
            style={{ marginTop: 4 }}
            readOnly
            rows={5}
            value={siguienteInfo.mensaje}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div style={{ marginTop: 6 }}>
            <button
              className="mcw-copy-btn"
              onClick={() => copiar(siguienteInfo.mensaje, "mensaje")}
            >
              {copiado === "mensaje" ? "¡Copiado!" : "📋 Copiar mensaje de nuevo"}
            </button>
          </div>
        </div>
      )}
      <div className="mcw-row">
        <button className="mcw-btn mcw-btn-primary" onClick={abrirSiguiente}>
          Siguiente (copia mensaje)
        </button>
        <button className="mcw-btn" onClick={marcarEnviado} disabled={!siguienteInfo}>
          ✓ Enviado, sacar de la cola
        </button>
      </div>
      {status && <div className="mcw-ok">{status}</div>}
    </div>
  );
}
