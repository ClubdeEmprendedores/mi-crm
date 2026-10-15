import { createClient } from "@supabase/supabase-js";

// Desde el 15/10/2026 la base del CRM no acepta la clave anon sola: hay que
// entrar con un usuario admin (mismo mail y contraseña que la web del CRM).
const SUPABASE_URL = "https://qbilzmsqwcawuvuvbcvo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaWx6bXNxd2Nhd3V2dXZiY3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUyMzAsImV4cCI6MjA5NTQwMTIzMH0.bJiP_owO35FAP2-diFtdvVy8hUxcraYOdfMBbCT42_k";

// La sesión se guarda en chrome.storage.local (no localStorage): así la comparten
// el content script y el service worker, que no tiene `window`.
const chromeStorage = {
  getItem: async (key: string) => ((await chrome.storage.local.get(key))[key] as string | undefined) ?? null,
  setItem: (key: string, value: string) => chrome.storage.local.set({ [key]: value }),
  removeItem: (key: string) => chrome.storage.local.remove(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: chromeStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
