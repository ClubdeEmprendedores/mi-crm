import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { WspConversacion, WspMensaje } from "../types";

type ConvRow = {
  telefono: string;
  step: number;
  origen: string;
  producto: string | null;
  nombre: string | null;
  instagram: string | null;
  otros_showrooms: boolean | null;
  showrooms_detalle: string | null;
  tiene_tienda_propia: boolean | null;
  estado_venta: string | null;
  tiene_stock: boolean | null;
  local_elegido: string | null;
  lead_listo: boolean;
  atendido_por_humano: boolean;
  created_at: string;
  updated_at: string;
};

type MensajeRow = {
  id: number;
  telefono: string;
  direccion: "entrante" | "saliente";
  texto: string;
  created_at: string;
};

function fromConvRow(row: ConvRow): WspConversacion {
  return {
    telefono: row.telefono,
    step: row.step,
    origen: row.origen,
    producto: row.producto ?? undefined,
    nombre: row.nombre ?? undefined,
    instagram: row.instagram ?? undefined,
    otrosShowrooms: row.otros_showrooms ?? undefined,
    showroomsDetalle: row.showrooms_detalle ?? undefined,
    tieneTiendaPropia: row.tiene_tienda_propia ?? undefined,
    estadoVenta: row.estado_venta ?? undefined,
    tieneStock: row.tiene_stock ?? undefined,
    localElegido: row.local_elegido ?? undefined,
    leadListo: row.lead_listo,
    atendidoPorHumano: row.atendido_por_humano,
    creadoEn: row.created_at,
    actualizadoEn: row.updated_at,
  };
}

function fromMensajeRow(row: MensajeRow): WspMensaje {
  return {
    id: row.id,
    telefono: row.telefono,
    direccion: row.direccion,
    texto: row.texto,
    creadoEn: row.created_at,
  };
}

export function useWspConversaciones() {
  const [conversaciones, setConversaciones] = useState<WspConversacion[]>([]);
  const [mensajesPorTelefono, setMensajesPorTelefono] = useState<Record<string, WspMensaje[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("wsp_conversaciones")
      .select("*")
      .order("updated_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    setConversaciones((data as ConvRow[]).map(fromConvRow));
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const clearError = useCallback(() => setError(null), []);

  const cargarMensajes = useCallback(async (telefono: string) => {
    const { data, error: err } = await supabase
      .from("wsp_mensajes")
      .select("*")
      .eq("telefono", telefono)
      .order("created_at", { ascending: true });
    if (err) { setError(err.message); return; }
    setMensajesPorTelefono((prev) => ({ ...prev, [telefono]: (data as MensajeRow[]).map(fromMensajeRow) }));
  }, []);

  const enviarManual = useCallback(async (telefono: string, texto: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/enviar-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, texto }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Error enviando el mensaje");
      await cargarMensajes(telefono);
      setConversaciones((prev) =>
        prev.map((c) => (c.telefono === telefono ? { ...c, atendidoPorHumano: true } : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error enviando el mensaje");
    } finally {
      setSending(false);
    }
  }, [cargarMensajes]);

  return { conversaciones, mensajesPorTelefono, loading, error, sending, clearError, cargarMensajes, enviarManual };
}
