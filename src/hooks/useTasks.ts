import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Task } from "../types";

type DbRow = {
  id: string;
  texto: string;
  hecha: boolean;
  creado_en: string;
};

function fromDb(row: DbRow): Task {
  return {
    id: row.id,
    texto: row.texto,
    hecha: row.hecha,
    creadoEn: row.creado_en,
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("tasks")
        .select("*")
        .order("creado_en", { ascending: false });
      if (err) { setError(err.message); setLoading(false); return; }
      setTasks((data as DbRow[]).map(fromDb));
      setLoading(false);
    })();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const addTask = useCallback(async (texto: string) => {
    const { data, error: err } = await supabase
      .from("tasks")
      .insert({ texto, hecha: false })
      .select()
      .single();
    if (err) { setError(err.message); return; }
    setTasks((prev) => [fromDb(data as DbRow), ...prev]);
  }, []);

  const toggleTask = useCallback(async (id: string, hecha: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, hecha } : t)));
    const { error: err } = await supabase.from("tasks").update({ hecha }).eq("id", id);
    if (err) setError(err.message);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error: err } = await supabase.from("tasks").delete().eq("id", id);
    if (err) setError(err.message);
  }, []);

  return { tasks, loading, error, clearError, addTask, toggleTask, deleteTask };
}
