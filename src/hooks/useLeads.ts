import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { HistorialEntry, Lead, PropuestaOption, SedeOption, Stage } from "../types";
import { mergeHistorial } from "../utils/mergeHistorial";
import { phoneKey } from "../utils/phone";

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Etiquetas que se usan para categorizar chats de WhatsApp, no son nombres reales.
const JUNK_NAMES = new Set(["aprobado", "no aprobado"]);

/** True si `nombre` no sirve como nombre real (vacío, etiqueta de categoría, o el propio teléfono). */
function isJunkName(nombre: string, telefono: string): boolean {
  const n = nombre.trim();
  if (!n) return true;
  if (JUNK_NAMES.has(n.toLowerCase())) return true;
  if (/^\d+$/.test(n) && n === telefono.trim()) return true;
  return false;
}

// Si un mismo valor de instagram/email/teléfono aparece en más de esta cantidad de
// leads, es probable que sea un texto genérico de una importación vieja (ej. "No tengo",
// "Número de campaña", "Revender") y no un identificador real de una persona.
const MAX_SHARED = 4;

function buildFrequency(leads: Lead[], pick: (l: Lead) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = pick(lead);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function findDuplicateGroups(leads: Lead[]): { primaryId: string; duplicateIds: string[] }[] {
  const sorted = [...leads].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const igCounts = buildFrequency(leads, (l) => normalize(l.instagram));
  const emailCounts = buildFrequency(leads, (l) => normalize(l.email));
  const phoneCounts = buildFrequency(leads, (l) => phoneKey(l.telefono));

  const seenIg = new Map<string, string>();
  const seenEmail = new Map<string, string>();
  const seenPhone = new Map<string, string>();
  const groups = new Map<string, string[]>();

  for (const lead of sorted) {
    let ig = normalize(lead.instagram);
    let email = normalize(lead.email);
    let phone = phoneKey(lead.telefono);
    if (ig && (igCounts.get(ig) ?? 0) > MAX_SHARED) ig = "";
    if (email && (emailCounts.get(email) ?? 0) > MAX_SHARED) email = "";
    if (phone && (phoneCounts.get(phone) ?? 0) > MAX_SHARED) phone = "";

    const primaryId =
      (ig && seenIg.get(ig)) ||
      (email && seenEmail.get(email)) ||
      (phone && seenPhone.get(phone));

    if (primaryId) {
      const group = groups.get(primaryId) ?? [];
      group.push(lead.id);
      groups.set(primaryId, group);
    } else {
      if (ig) seenIg.set(ig, lead.id);
      if (email) seenEmail.set(email, lead.id);
      if (phone) seenPhone.set(phone, lead.id);
    }
  }

  return [...groups.entries()].map(([primaryId, duplicateIds]) => ({ primaryId, duplicateIds }));
}

/** Calcula los campos a copiar de `dup` hacia `primary` sin perder información. */
function mergeLeadInto(primary: Lead, dup: Lead): Partial<Lead> {
  const patch: Partial<Lead> = {};

  if (isJunkName(primary.nombre, primary.telefono) && !isJunkName(dup.nombre, dup.telefono)) {
    patch.nombre = dup.nombre;
  }
  if (!primary.empresa.trim() && dup.empresa.trim()) patch.empresa = dup.empresa;
  if (!primary.email.trim() && dup.email.trim()) patch.email = dup.email;
  if (!primary.telefono.trim() && dup.telefono.trim()) patch.telefono = dup.telefono;
  if (!primary.instagram.trim() && dup.instagram.trim()) patch.instagram = dup.instagram;
  if (!primary.contactId && dup.contactId) patch.contactId = dup.contactId;

  const notasA = primary.notas.trim();
  const notasB = dup.notas.trim();
  if (notasB && notasB !== notasA) {
    patch.notas = notasA ? `${notasA}\n${notasB}` : notasB;
  }

  const tags = new Set([...primary.tags, ...dup.tags]);
  if (tags.size !== primary.tags.length) patch.tags = [...tags];

  const historial = mergeHistorial(primary.historial, dup.historial);
  if (historial.length !== primary.historial.length) patch.historial = historial;

  if (dup.ultimoMensajeEn && (!primary.ultimoMensajeEn || dup.ultimoMensajeEn > primary.ultimoMensajeEn)) {
    patch.ultimoMensajeEn = dup.ultimoMensajeEn;
  }

  if (dup.noRecontactar && !primary.noRecontactar) patch.noRecontactar = true;
  if (!primary.motivoBaja.trim() && dup.motivoBaja.trim()) patch.motivoBaja = dup.motivoBaja;

  if (primary.etapa === "nuevo" && dup.etapa !== "nuevo") {
    patch.etapa = dup.etapa;
    if (dup.contactadoEn) patch.contactadoEn = dup.contactadoEn;
    if (dup.propuesta) patch.propuesta = dup.propuesta;
    if (dup.sede) patch.sede = dup.sede;
  } else {
    if (!primary.contactadoEn && dup.contactadoEn) patch.contactadoEn = dup.contactadoEn;
    if (!primary.propuesta && dup.propuesta) patch.propuesta = dup.propuesta;
    if (!primary.sede && dup.sede) patch.sede = dup.sede;
  }

  return patch;
}

type DbRow = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  notas: string;
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
  historial: HistorialEntry[] | null;
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
    historial: row.historial ?? [],
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
  if (patch.etapa !== undefined) row.etapa = patch.etapa;
  if (patch.contactadoEn !== undefined) row.contactado_en = patch.contactadoEn || null;
  if (patch.propuesta !== undefined) row.propuesta = patch.propuesta || null;
  if (patch.sede !== undefined) row.sede = patch.sede || null;
  if (patch.contactId !== undefined) row.contact_id = patch.contactId || null;
  if (patch.motivoBaja !== undefined) row.motivo_baja = patch.motivoBaja;
  if (patch.noRecontactar !== undefined) row.no_recontactar = patch.noRecontactar;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.ultimoMensajeEn !== undefined) row.ultimo_mensaje_en = patch.ultimoMensajeEn || null;
  if (patch.historial !== undefined) row.historial = patch.historial;
  return row;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const PAGE = 1000;
      const all: DbRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error: err } = await supabase
          .from("leads")
          .select("*")
          .order("creado_en", { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (err) { setError(err.message); break; }
        all.push(...(data as DbRow[]));
        if (!data || data.length < PAGE) break;
      }
      setLeads(all.map(fromDb));
      setLoading(false);
    })();
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
          etapa: data.etapa ?? "nuevo",
          contact_id: data.contactId || null,
          motivo_baja: data.motivoBaja,
          no_recontactar: data.noRecontactar,
          tags: data.tags ?? [],
          historial: data.historial ?? [],
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
      etapa: "nuevo",
      tags: data.tags ?? [],
      historial: data.historial ?? [],
    }));
    const { data, error: err } = await supabase
      .from("leads")
      .insert(rows)
      .select();
    if (err) { setError(err.message); return 0; }
    setLeads((prev) => [...(data as DbRow[]).map(fromDb), ...prev]);
    return data.length;
  }, []);

  const countDuplicates = useCallback(
    () => findDuplicateGroups(leads).reduce((sum, g) => sum + g.duplicateIds.length, 0),
    [leads],
  );

  const deduplicateLeads = useCallback(async (): Promise<number> => {
    const groups = findDuplicateGroups(leads);
    if (groups.length === 0) return 0;
    const leadById = new Map(leads.map((l) => [l.id, l]));
    const toDelete: string[] = [];

    for (const { primaryId, duplicateIds } of groups) {
      let merged = leadById.get(primaryId);
      if (!merged) continue;
      let patch: Partial<Lead> = {};
      for (const dupId of duplicateIds) {
        const dup = leadById.get(dupId);
        if (!dup) continue;
        const dupPatch = mergeLeadInto(merged, dup);
        patch = { ...patch, ...dupPatch };
        merged = { ...merged, ...dupPatch };
        toDelete.push(dupId);
      }
      if (Object.keys(patch).length > 0) await updateLead(primaryId, patch);
    }

    if (toDelete.length === 0) return 0;
    const { error: err } = await supabase.from("leads").delete().in("id", toDelete);
    if (err) { setError(err.message); return 0; }
    setLeads((prev) => prev.filter((l) => !toDelete.includes(l.id)));
    return toDelete.length;
  }, [leads, updateLead]);

  const deleteLeads = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    const { error: err } = await supabase.from("leads").delete().in("id", ids);
    if (err) setError(err.message);
  }, []);

  return { leads, loading, error, clearError, addLead, addLeads, updateLead, moveLead, deleteLead, deleteLeads, countDuplicates, deduplicateLeads };
}
