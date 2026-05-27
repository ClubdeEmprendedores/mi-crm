import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Lead, PropuestaOption, SedeOption, Stage } from "../types";

type DbRow = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  notas: string;
  valor_estimado: number;
  etapa: string;
  creado_en: string;
  contactado_en: string | null;
  propuesta: string | null;
  sede: string | null;
};

function fromDb(row: DbRow): Lead {
  return {
    id: row.id,
    nombre: row.nombre,
    empresa: row.empresa,
    email: row.email,
    telefono: row.telefono,
    instagram: row.instagram,
    notas: row.notas,
    valorEstimado: row.valor_estimado,
    etapa: row.etapa as Stage,
    creadoEn: row.creado_en,
    contactadoEn: row.contactado_en ?? undefined,
    propuesta: (row.propuesta as PropuestaOption) ?? undefined,
    sede: (row.sede as SedeOption) ?? undefined,
  };
}

function toDbPatch(patch: Partial<Lead>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.nombre !== undefined) row.nombre = patch.nombre;
  if (patch.empresa !== undefined) row.empresa = patch.empresa;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.telefono !== undefined) row.telefono = patch.telefono;
  if (patch.instagram !== undefined) row.instagram = patch.instagram;
  if (patch.notas !== undefined) row.notas = patch.notas;
  if (patch.valorEstimado !== undefined) row.valor_estimado = patch.valorEstimado;
  if (patch.etapa !== undefined) row.etapa = patch.etapa;
  if (patch.contactadoEn !== undefined) row.contactado_en = patch.contactadoEn || null;
  if (patch.propuesta !== undefined) row.propuesta = patch.propuesta || null;
  if (patch.sede !== undefined) row.sede = patch.sede || null;
  return row;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("leads")
      .select("*")
      .order("creado_en", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setLeads((data as DbRow[]).map(fromDb));
        setLoading(false);
      });
  }, []);

  const addLead = useCallback(
    async (data: Omit<Lead, "id" | "creadoEn" | "etapa"> & { etapa?: Stage }) => {
      const { data: row, error: err } = await supabase
        .from("leads")
        .insert({
          nombre: data.nombre,
          empresa: data.empresa,
          email: data.email,
          telefono: data.telefono,
          instagram: data.instagram,
          notas: data.notas,
          valor_estimado: data.valorEstimado,
          etapa: data.etapa ?? "nuevo",
        })
        .select()
        .single();
      if (err) { setError(err.message); return; }
      setLeads((prev) => [fromDb(row as DbRow), ...prev]);
    },
    [],
  );

  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error: err } = await supabase
      .from("leads")
      .update(toDbPatch(patch))
      .eq("id", id);
    if (err) setError(err.message);
  }, []);

  const moveLead = useCallback(async (id: string, etapa: Stage) => {
    const now = new Date().toISOString();
    setLeads((prev) => {
      const lead = prev.find((l) => l.id === id);
      const autoContactadoEn = etapa === "contactado" && !lead?.contactadoEn ? now : undefined;
      return prev.map((l) =>
        l.id === id
          ? { ...l, etapa, ...(autoContactadoEn ? { contactadoEn: autoContactadoEn } : {}) }
          : l,
      );
    });
    const patch: Record<string, unknown> = { etapa };
    const currentLead = leads.find((l) => l.id === id);
    if (etapa === "contactado" && !currentLead?.contactadoEn) patch.contactado_en = now;
    const { error: err } = await supabase.from("leads").update(patch).eq("id", id);
    if (err) setError(err.message);
  }, [leads]);

  const deleteLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    const { error: err } = await supabase.from("leads").delete().eq("id", id);
    if (err) setError(err.message);
  }, []);

  const addLeads = useCallback(async (items: Partial<Lead>[]) => {
    const rows = items.map((data) => ({
      nombre: data.nombre ?? "",
      empresa: data.empresa ?? "",
      email: data.email ?? "",
      telefono: data.telefono ?? "",
      instagram: data.instagram ?? "",
      notas: data.notas ?? "",
      valor_estimado: data.valorEstimado ?? 0,
      etapa: "nuevo",
    }));
    const { data, error: err } = await supabase
      .from("leads")
      .insert(rows)
      .select();
    if (err) { setError(err.message); return 0; }
    setLeads((prev) => [...(data as DbRow[]).map(fromDb), ...prev]);
    return data.length;
  }, []);

  return { leads, loading, error, addLead, addLeads, updateLead, moveLead, deleteLead };
}
