import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Pantalla de ingreso del CRM. Desde el 15/10/2026 la base solo responde a
// usuarios logueados con un mail autorizado (ver supabase/cerrar_acceso_anon.sql),
// así que sin sesión el CRM no carga nada.
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function ingresar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Mail o contraseña incorrectos.");
    setCargando(false);
  }

  if (session === undefined) return null;
  if (session) return <>{children}</>;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "var(--bg)" }}>
      <form
        onSubmit={ingresar}
        style={{
          width: "100%",
          maxWidth: 360,
          display: "grid",
          gap: 12,
          padding: 28,
          borderRadius: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        <img src="/cde-logo.png" alt="Club de Emprendedores" style={{ maxWidth: 180, margin: "0 auto 8px" }} />
        <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
          Mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
          Contraseña
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

// Encabezado de autorización para los endpoints propios (/api/*), que
// verifican la sesión antes de mandar mails o WhatsApps.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
