// Pinged daily by the Vercel cron (see vercel.json) to keep the Supabase
// free-tier project active — it auto-pauses after 7 days without API requests.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    res.status(500).json({ ok: false, error: "Missing Supabase env vars" });
    return;
  }

  try {
    const r = await fetch(`${url}/rest/v1/leads?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    res.status(200).json({ ok: r.ok, status: r.status, ts: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err) });
  }
}
