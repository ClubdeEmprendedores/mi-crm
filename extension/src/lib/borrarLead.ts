import { supabase } from "./supabaseClient";

/**
 * Borra un lead por completo: sus tareas, lo que haya del bot de WhatsApp y de la
 * agenda de contactos con ese mismo teléfono, y el lead. No se puede deshacer, por
 * eso siempre pide confirmación con nombre y teléfono antes de tocar nada.
 * Devuelve true si se borró.
 */
export async function borrarLeadCompleto(lead: { id: string; nombre: string; telefono: string }): Promise<boolean> {
  const ok = window.confirm(
    `¿Borrar por completo a ${lead.nombre || "este contacto"} (${lead.telefono}) del CRM?\n\n` +
      "Se borran también sus tareas. No se puede deshacer.",
  );
  if (!ok) return false;
  await supabase.from("tasks").delete().eq("lead_id", lead.id);
  if (lead.telefono) {
    await supabase.from("wsp_mensajes").delete().eq("telefono", lead.telefono);
    await supabase.from("wsp_conversaciones").delete().eq("telefono", lead.telefono);
    await supabase.from("contacts").delete().eq("telefono", lead.telefono);
  }
  const { error } = await supabase.from("leads").delete().eq("id", lead.id);
  if (error) {
    window.alert(`No se pudo borrar: ${error.message}`);
    return false;
  }
  return true;
}
