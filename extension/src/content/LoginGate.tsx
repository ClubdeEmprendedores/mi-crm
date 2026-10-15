import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

/** Muestra el panel solo con sesión iniciada; si no, un login chico con mail y contraseña del CRM. */
export function LoginGate({ children }: { children: ReactNode }) {
  const [logueado, setLogueado] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogueado(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setLogueado(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (logueado === null) return null;
  if (logueado) return <>{children}</>;

  const entrar = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("No pude entrar: revisá mail y contraseña.");
  };

  return (
    <div className="mcw-queuebar">
      <div>🔒 CRM: iniciá sesión (mismo usuario que la web del CRM)</div>
      <div className="mcw-row">
        <input className="mcw-input" type="email" placeholder="Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="mcw-row">
        <input
          className="mcw-input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") entrar();
          }}
        />
      </div>
      <div className="mcw-row">
        <button className="mcw-btn mcw-btn-primary" onClick={entrar}>
          Entrar
        </button>
      </div>
      {error && (
        <div className="mcw-ok" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}
    </div>
  );
}
