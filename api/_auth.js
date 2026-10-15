// Verifica que el pedido venga de alguien logueado en el CRM con un mail
// autorizado. Los archivos de /api que empiezan con "_" no son endpoints.
// Mantener la lista igual a public.es_admin_crm() (supabase/cerrar_acceso_anon.sql).
const ADMINS = ["escandarani.1981@gmail.com", "miembros.cde@gmail.com"];

export async function requireAdmin(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!url || !anon || !token) {
    res.status(401).json({ ok: false, error: "Necesitás ingresar al CRM." });
    return null;
  }
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    const user = r.ok ? await r.json() : null;
    const email = (user?.email || "").toLowerCase();
    if (!ADMINS.includes(email)) {
      res.status(403).json({ ok: false, error: "No autorizado." });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ ok: false, error: "No se pudo verificar la sesión." });
    return null;
  }
}
