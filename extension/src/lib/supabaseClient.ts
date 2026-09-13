import { createClient } from "@supabase/supabase-js";

// Mismas credenciales publicas que ya expone el bundle web de mi-crm hoy
// (anon key, sin RLS en el proyecto — ver D:\CdE\mi-crm\CLAUDE.md).
const SUPABASE_URL = "https://qbilzmsqwcawuvuvbcvo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaWx6bXNxd2Nhd3V2dXZiY3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUyMzAsImV4cCI6MjA5NTQwMTIzMH0.bJiP_owO35FAP2-diFtdvVy8hUxcraYOdfMBbCT42_k";

// persistSession/detectSessionInUrl en false: esta extension solo usa el anon
// key para leer/escribir datos (sin auth de usuario), y el service worker no
// tiene `window`/`localStorage` — dejarlos default rompe la inicializacion ahi.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: false },
});
