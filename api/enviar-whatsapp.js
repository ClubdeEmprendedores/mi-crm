// Proxy server-side hacia wsp-bot/api/enviar-manual.js — guarda el secret
// compartido (WSP_BOT_API_KEY) fuera del bundle del navegador. Lo llama la
// pestaña "WhatsApp Bot" del CRM para que Matias responda a mano.
export default async function handler(req, res) {
  // DESHABILITADO 15/10/2026: el endpoint no tenía autenticación y alguien
  // externo lo usó para mandar mensajes en nombre del Club. Queda apagado
  // hasta que el CRM tenga login y el endpoint verifique la sesión.
  res.status(503).json({ ok: false, error: "Deshabilitado temporalmente por seguridad." });
  return;
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.WSP_BOT_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "Falta WSP_BOT_API_KEY en las variables de entorno" });
    return;
  }

  const { telefono, texto } = req.body ?? {};
  if (!telefono || !texto) {
    res.status(400).json({ ok: false, error: "Faltan telefono o texto" });
    return;
  }

  try {
    const r = await fetch("https://wsp-bot.vercel.app/api/enviar-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ telefono, texto }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err) });
  }
}
