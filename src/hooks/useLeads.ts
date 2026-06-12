import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Lead, PropuestaOption, SedeOption, Stage } from "../types";

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function findDuplicateIds(leads: Lead[]): string[] {
  const sorted = [...leads].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const seenIg = new Set<string>();
  const seenEmail = new Set<string>();
  const seenNombre = new Set<string>();
  const toDelete: string[] = [];
  for (const lead of sorted) {
    const ig = normalize(lead.instagram);
    const email = normalize(lead.email);
    const nombre = normalize(lead.nombre);
    const isDuplicate =
      (ig && seenIg.has(ig)) ||
      (email && seenEmail.has(email)) ||
      (nombre && seenNombre.has(nombre));
    if (isDuplicate) {
      toDelete.push(lead.id);
    } else {
      if (ig) seenIg.add(ig);
      if (email) seenEmail.add(email);
      if (nombre) seenNombre.add(nombre);
    }
  }
  return toDelete;
}

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
  contact_id: string | null;
  motivo_baja: string | null;
  no_recontactar: boolean | null;
  tags: string[] | null;
  ultimo_mensaje_en: string | null;
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
    contactId: row.contact_id ?? undefined,
    motivoBaja: row.motivo_baja ?? "",
    noRecontactar: row.no_recontactar ?? false,
    tags: row.tags ?? [],
    ultimoMensajeEn: row.ultimo_mensaje_en ?? undefined,
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
  if (patch.contactId !== undefined) row.contact_id = patch.contactId || null;
  if (patch.motivoBaja !== undefined) row.motivo_baja = patch.motivoBaja;
  if (patch.noRecontactar !== undefined) row.no_recontactar = patch.noRecontactar;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.ultimoMensajeEn !== undefined) row.ultimo_mensaje_en = patch.ultimoMensajeEn || null;
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
          contact_id: data.contactId || null,
          motivo_baja: data.motivoBaja,
          no_recontactar: data.noRecontactar,
          tags: data.tags ?? [],
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

  const clearError = useCallback(() => setError(null), []);

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
      tags: data.tags ?? [],
    }));
    const { data, error: err } = await supabase
      .from("leads")
      .insert(rows)
      .select();
    if (err) { setError(err.message); return 0; }
    setLeads((prev) => [...(data as DbRow[]).map(fromDb), ...prev]);
    return data.length;
  }, []);

  const countDuplicates = useCallback(() => findDuplicateIds(leads).length, [leads]);

  const deduplicateLeads = useCallback(async (): Promise<number> => {
    const toDelete = findDuplicateIds(leads);
    if (toDelete.length === 0) return 0;
    const { error: err } = await supabase.from("leads").delete().in("id", toDelete);
    if (err) { setError(err.message); return 0; }
    setLeads((prev) => prev.filter((l) => !toDelete.includes(l.id)));
    return toDelete.length;
  }, [leads]);

  const deleteLeads = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    const { error: err } = await supabase.from("leads").delete().in("id", ids);
    if (err) setError(err.message);
  }, []);

  return { leads, loading, error, clearError, addLead, addLeads, updateLead, moveLead, deleteLead, deleteLeads, countDuplicates, deduplicateLeads };
}
