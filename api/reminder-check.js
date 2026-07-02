// Corre una vez por día (ver vercel.json). Busca leads en etapa "contactado"
// que llevan más de RECORDATORIO_DIAS sin mensaje y, si no tienen ya un
// recordatorio pendiente, crea una tarea en la tabla `tasks` para que no se
// pierdan en el seguimiento.
const RECORDATORIO_DIAS = 14;
const MAX_POR_CORRIDA = 30;

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    res.status(500).json({ ok: false, error: "Missing Supabase env vars" });
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    const leadsRes = await fetch(
      `${url}/rest/v1/leads?select=id,nombre,contactado_en,ultimo_mensaje_en,no_recontactar,telefono&etapa=eq.contactado`,
      { headers },
    );
    if (!leadsRes.ok) {
      res.status(502).json({ ok: false, error: `Error leyendo leads: ${leadsRes.status}` });
      return;
    }
    const leads = await leadsRes.json();

    const cutoff = Date.now() - RECORDATORIO_DIAS * 24 * 60 * 60 * 1000;
    const candidatos = leads.filter((l) => {
      if (l.no_recontactar || !l.telefono) return false;
      const ref = l.ultimo_mensaje_en || l.contactado_en;
      if (!ref) return false;
      return new Date(ref).getTime() < cutoff;
    });

    if (candidatos.length === 0) {
      res.status(200).json({ ok: true, creadas: 0, revisados: leads.length });
      return;
    }

    // Evitar duplicar: traer tareas pendientes que ya referencian un lead.
    const tasksRes = await fetch(
      `${url}/rest/v1/tasks?select=lead_id&hecha=eq.false&lead_id=not.is.null`,
      { headers },
    );
    const existentes = tasksRes.ok ? await tasksRes.json() : [];
    const yaTieneRecordatorio = new Set(existentes.map((t) => t.lead_id));

    const aCrear = candidatos
      .filter((l) => !yaTieneRecordatorio.has(l.id))
      .slice(0, MAX_POR_CORRIDA)
      .map((l) => {
        const ref = l.ultimo_mensaje_en || l.contactado_en;
        const dias = Math.floor((Date.now() - new Date(ref).getTime()) / (24 * 60 * 60 * 1000));
        return {
          texto: `Volver a escribir a ${l.nombre || "lead sin nombre"} (sin respuesta hace ${dias} días)`,
          hecha: false,
          lead_id: l.id,
        };
      });

    if (aCrear.length === 0) {
      res.status(200).json({ ok: true, creadas: 0, revisados: leads.length, candidatos: candidatos.length });
      return;
    }

    const insertRes = await fetch(`${url}/rest/v1/tasks`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(aCrear),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      res.status(502).json({ ok: false, error: `Error creando tareas: ${insertRes.status} ${text}` });
      return;
    }

    res.status(200).json({ ok: true, creadas: aCrear.length, revisados: leads.length, candidatos: candidatos.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
