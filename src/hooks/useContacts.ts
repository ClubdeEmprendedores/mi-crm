import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Contact } from "../types";

type DbRow = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  notas: string;
  creado_en: string;
};

function fromDb(row: DbRow): Contact {
  return {
    id: row.id,
    nombre: row.nombre,
    empresa: row.empresa,
    email: row.email,
    telefono: row.telefono,
    instagram: row.instagram,
    notas: row.notas,
    creadoEn: row.creado_en,
  };
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const PAGE = 1000;
      const all: DbRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error: err } = await supabase
          .from("contacts")
          .select("*")
          .order("creado_en", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (err) { setError(err.message); break; }
        all.push(...(data as DbRow[]));
        if (!data || data.length < PAGE) break;
      }
      setContacts(all.map(fromDb));
      setLoading(false);
    })();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const addContact = useCallback(
    async (data: Omit<Contact, "id" | "creadoEn">): Promise<Contact | null> => {
      const { data: row, error: err } = await supabase
        .from("contacts")
        .insert({
          nombre: data.nombre,
          empresa: data.empresa,
          email: data.email,
          telefono: data.telefono,
          instagram: data.instagram,
          notas: data.notas,
        })
        .select()
        .single();
      if (err) { setError(err.message); return null; }
      const contact = fromDb(row as DbRow);
      setContacts((prev) => [contact, ...prev]);
      return contact;
    },
    [],
  );

  const addContacts = useCallback(
    async (items: Omit<Contact, "id" | "creadoEn">[]): Promise<number> => {
      const { data, error: err } = await supabase
        .from("contacts")
        .insert(items.map((d) => ({
          nombre: d.nombre,
          empresa: d.empresa,
          email: d.email,
          telefono: d.telefono,
          instagram: d.instagram,
          notas: d.notas,
        })))
        .select();
      if (err) { setError(err.message); return 0; }
      setContacts((prev) => [...(data as DbRow[]).map(fromDb), ...prev]);
      return data.length;
    },
    [],
  );

  const updateContact = useCallback(
    async (id: string, patch: Partial<Omit<Contact, "id" | "creadoEn">>) => {
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const row: Record<string, unknown> = {};
      if (patch.nombre !== undefined) row.nombre = patch.nombre;
      if (patch.empresa !== undefined) row.empresa = patch.empresa;
      if (patch.email !== undefined) row.email = patch.email;
      if (patch.telefono !== undefined) row.telefono = patch.telefono;
      if (patch.instagram !== undefined) row.instagram = patch.instagram;
      if (patch.notas !== undefined) row.notas = patch.notas;
      const { error: err } = await supabase.from("contacts").update(row).eq("id", id);
      if (err) setError(err.message);
    },
    [],
  );

  const deleteContact = useCallback(async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    const { error: err } = await supabase.from("contacts").delete().eq("id", id);
    if (err) setError(err.message);
  }, []);

  return { contacts, loading, error, clearError, addContact, addContacts, updateContact, deleteContact };
}
