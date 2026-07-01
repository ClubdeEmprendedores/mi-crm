// Envía los mails del reporte mensual usando la cuenta de Gmail del club.
// Requiere las variables de entorno en Vercel: GMAIL_USER y GMAIL_APP_PASSWORD
// (una "contraseña de aplicación" generada en https://myaccount.google.com/apppasswords,
// no la contraseña normal de la cuenta).
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    res.status(500).json({
      ok: false,
      error: "Faltan las variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD en Vercel.",
    });
    return;
  }

  const { emails } = req.body ?? {};
  if (!Array.isArray(emails) || emails.length === 0) {
    res.status(400).json({ ok: false, error: "Falta la lista de emails a enviar" });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const results = [];
  for (const item of emails) {
    const { to, subject, text } = item ?? {};
    if (!to || !subject || !text) {
      results.push({ to: to ?? null, ok: false, error: "Faltan datos (to/subject/text)" });
      continue;
    }
    try {
      await transporter.sendMail({ from: user, to, subject, text });
      results.push({ to, ok: true });
    } catch (err) {
      results.push({ to, ok: false, error: String(err) });
    }
    // Pequeña pausa entre envíos para no gatillar límites de Gmail.
    await new Promise((r) => setTimeout(r, 250));
  }

  const sent = results.filter((r) => r.ok).length;
  res.status(200).json({ ok: true, sent, total: emails.length, results });
}
