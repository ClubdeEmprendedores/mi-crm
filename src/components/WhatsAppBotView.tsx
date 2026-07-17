import { useEffect, useState } from "react";
import type { WspConversacion, WspMensaje } from "../types";

type Props = {
  conversaciones: WspConversacion[];
  mensajesPorTelefono: Record<string, WspMensaje[]>;
  loading: boolean;
  error: string | null;
  sending: boolean;
  onSelect: (telefono: string) => void;
  onEnviar: (telefono: string, texto: string) => void;
};

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nombreConversacion(c: WspConversacion) {
  return c.nombre || c.producto || c.telefono;
}

export function WhatsAppBotView({
  conversaciones, mensajesPorTelefono, loading, error, sending, onSelect, onEnviar,
}: Props) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (seleccionado) onSelect(seleccionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado]);

  if (loading) {
    return <div className="app-loading">Cargando conversaciones del bot…</div>;
  }

  if (error) {
    const errLower = error.toLowerCase();
    const needsMigration =
      errLower.includes("does not exist") ||
      errLower.includes("no existe") ||
      errLower.includes("could not find the table") ||
      errLower.includes("schema cache");
    if (needsMigration) {
      return (
        <div className="contacts-migration">
          <div className="contacts-migration-box">
            <h3>Falta el schema del bot de WhatsApp</h3>
            <p>Corré el SQL de <code>wsp-bot/supabase_schema_v2.sql</code> en el SQL Editor de Supabase.</p>
          </div>
        </div>
      );
    }
  }

  const conv = conversaciones.find((c) => c.telefono === seleccionado) ?? null;
  const mensajes = seleccionado ? mensajesPorTelefono[seleccionado] ?? [] : [];

  const handleEnviar = () => {
    if (!seleccionado || !texto.trim()) return;
    onEnviar(seleccionado, texto.trim());
    setTexto("");
  };

  return (
    <div className="wspbot-wrap">
      <div className="wspbot-list">
        {conversaciones.length === 0 ? (
          <div className="list-empty"><p>Todavía no escribió nadie.</p></div>
        ) : (
          conversaciones.map((c) => (
            <button
              key={c.telefono}
              type="button"
              className={`wspbot-list-item${c.telefono === seleccionado ? " wspbot-list-item--active" : ""}`}
              onClick={() => setSeleccionado(c.telefono)}
            >
              <div className="wspbot-list-item-top">
                <span className="wspbot-list-item-nombre">{nombreConversacion(c)}</span>
                {c.leadListo && <span className="wspbot-badge wspbot-badge--listo">Listo</span>}
                {c.atendidoPorHumano && <span className="wspbot-badge wspbot-badge--humano">Vos</span>}
              </div>
              <div className="wspbot-list-item-sub">{c.producto || "Sin producto todavía"}</div>
              <div className="wspbot-list-item-fecha">{formatFechaHora(c.actualizadoEn)}</div>
            </button>
          ))
        )}
      </div>

      <div className="wspbot-detail">
        {!conv ? (
          <div className="list-empty"><p>Elegí una conversación para ver el detalle.</p></div>
        ) : (
          <>
            <div className="wspbot-info">
              <div><strong>{nombreConversacion(conv)}</strong> · {conv.telefono}</div>
              <div className="wspbot-info-grid">
                {conv.instagram && <span>📸 @{conv.instagram}</span>}
                {conv.estadoVenta && <span>🛍️ {conv.estadoVenta === "ya_vendo" ? "Ya vende" : "Recién arranca"}</span>}
                {conv.tieneStock !== undefined && <span>📦 Stock: {conv.tieneStock ? "Sí" : "No"}</span>}
                {conv.otrosShowrooms !== undefined && (
                  <span>🏬 Otros showrooms: {conv.otrosShowrooms ? (conv.showroomsDetalle || "Sí") : "No"}</span>
                )}
                {conv.tieneTiendaPropia !== undefined && <span>🛒 Tienda propia: {conv.tieneTiendaPropia ? "Sí" : "No"}</span>}
                {conv.mayorTraba && <span>🚧 Mayor traba: {conv.mayorTraba}</span>}
                {conv.localElegido && <span>📍 Local: {conv.localElegido}</span>}
              </div>
            </div>

            <div className="wspbot-chat">
              {mensajes.map((m) => (
                <div
                  key={m.id}
                  className={`wspbot-msg wspbot-msg--${m.direccion === "entrante" ? "in" : "out"}`}
                >
                  <div className="wspbot-msg-texto">{m.texto}</div>
                  <div className="wspbot-msg-fecha">{formatFechaHora(m.creadoEn)}</div>
                </div>
              ))}
            </div>

            <div className="wspbot-input-row">
              <input
                type="text"
                className="wspbot-input"
                placeholder="Escribir una respuesta…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEnviar(); }}
                disabled={sending}
              />
              <button type="button" className="btn btn-primary" onClick={handleEnviar} disabled={sending || !texto.trim()}>
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
