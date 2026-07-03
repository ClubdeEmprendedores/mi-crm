import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ContenidoItem, ContenidoSede, ContenidoTipo, EstadoCopy, EstadoFoto } from "../types";

type DbRow = {
  id: string;
  fecha: string;
  sede: ContenidoSede;
  etiqueta: string;
  tipo: ContenidoTipo;
  estado_foto: EstadoFoto;
  estado_copy: EstadoCopy;
  publicado: boolean;
  image_url: string | null;
  caption: string | null;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

type Patch = Partial<{
  fecha: string;
  sede: ContenidoSede;
  etiqueta: string;
  tipo: ContenidoTipo;
  estadoFoto: EstadoFoto;
  estadoCopy: EstadoCopy;
  publicado: boolean;
  imageUrl: string;
  caption: string;
  notas: string;
}>;

function fromDb(row: DbRow): ContenidoItem {
  return {
    id: row.id,
    fecha: row.fecha,
    sede: row.sede,
    etiqueta: row.etiqueta,
    tipo: row.tipo,
    estadoFoto: row.estado_foto,
    estadoCopy: row.estado_copy,
    publicado: row.publicado,
    imageUrl: row.image_url ?? undefined,
    caption: row.caption ?? undefined,
    notas: row.notas ?? undefined,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

function toDbPatch(patch: Patch) {
  const out: Record<string, unknown> = {};
  if (patch.fecha !== undefined) out.fecha = patch.fecha;
  if (patch.sede !== undefined) out.sede = patch.sede;
  if (patch.etiqueta !== undefined) out.etiqueta = patch.etiqueta;
  if (patch.tipo !== undefined) out.tipo = patch.tipo;
  if (patch.estadoFoto !== undefined) out.estado_foto = patch.estadoFoto;
  if (patch.estadoCopy !== undefined) out.estado_copy = patch.estadoCopy;
  if (patch.publicado !== undefined) out.publicado = patch.publicado;
  if (patch.imageUrl !== undefined) out.image_url = patch.imageUrl;
  if (patch.caption !== undefined) out.caption = patch.caption;
  if (patch.notas !== undefined) out.notas = patch.notas;
  out.actualizado_en = new Date().toISOString();
  return out;
}

export function useContenido() {
  const [items, setItems] = useState<ContenidoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("contenido_calendario")
        .select("*")
        .order("fecha", { ascending: true });
      if (err) { setError(err.message); setLoading(false); return; }
      setItems((data as DbRow[]).map(fromDb));
      setLoading(false);
    })();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const addItem = useCallback(async (item: Patch) => {
    const { data, error: err } = await supabase
      .from("contenido_calendario")
      .insert(toDbPatch(item))
      .select()
      .single();
    if (err) { setError(err.message); return; }
    setItems((prev) => [...prev, fromDb(data as DbRow)]);
  }, []);

  const updateItem = useCallback(async (id: string, patch: Patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error: err } = await supabase
      .from("contenido_calendario")
      .update(toDbPatch(patch))
      .eq("id", id);
    if (err) setError(err.message);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error: err } = await supabase.from("contenido_calendario").delete().eq("id", id);
    if (err) setError(err.message);
  }, []);

  return { items, loading, error, clearError, addItem, updateItem, deleteItem };
}
