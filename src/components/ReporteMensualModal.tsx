import { useMemo, useState } from "react";
import type { Lead } from "../types";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { parseReporteMensual, reporteEmailBody } from "../utils/parseReporteMensual";
import { normalizeSearch } from "../utils/text";
import { reporteEnviadoMensaje, whatsappUrl } from "../utils/whatsapp";

type Props = {
  leads: Lead[];
  onClose: () => void;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
  onSendWhatsapp: (id: string) => void;
};

type EmailResult = { to: string; ok: boolean; error?: string };

function normalizeHandle(s: string) {
  return normalizeSearch(s.trim().replace(/^@/, ""));
}

export function ReporteMensualModal({ leads, onClose, onUpdateLead, onSendWhatsapp }: Props) {
  useEscapeKey(onClose);

  const [mes, setMes] = useState("");
  const [texto, setTexto] = useState("");
  const [emailOverrides, setEmailOverrides] = useState<Record<number, string>>({});
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [wspSent, setWspSent] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; total: number; results: EmailResult[] } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const miembros = useMemo(() => leads.filter((l) => l.etapa === "ganado"), [leads]);

  const filas = useMemo(() => parseReporteMensual(texto), [texto]);

  const rows = useMemo(() => {
    return filas.map((fila, i) => {
      const igKey = normalizeHandle(fila.instagram);
      const empKey = normalizeSearch(fila.emprendimiento);
      const lead =
        (igKey && miembros.find((l) => l.instagram && normalizeHandle(l.instagram) === igKey)) ||
        (empKey && miembros.find((l) => l.empresa && normalizeSearch(l.empresa) === empKey)) ||
        (empKey && miembros.find((l) => normalizeSearch(l.nombre) === empKey)) ||
        null;
      const email = emailOverrides[i] ?? fila.email ?? lead?.email ?? "";
      return { i, fila, lead, email };
    });
  }, [filas, miembros, emailOverrides]);

  const matchedCount = rows.filter((r) => r.lead).length;
  const toSend = rows.filter((r) => r.lead && r.email.trim() && !excluded.has(r.i));

  const emailsDesactualizados = rows.filter(
    (r) => r.lead && r.email.trim() && r.email.trim() !== r.lead.email,
  );

  const actualizarMails = () => {
    for (const r of emailsDesactualizados) {
      if (!r.lead) continue;
      onUpdateLead(r.lead.id, { email: r.email.trim() });
    }
  };

  const enviarMails = async () => {
    if (toSend.length === 0) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const emails = toSend.map((r) => ({
        to: r.email.trim(),
        subject: `Reporte${mes ? ` ${mes}` : " mensual"} — Club de Emprendedores`,
        text: reporteEmailBody(r.lead!.nombre, r.fila.campos),
      }));
      const res = await fetch("/api/send-report-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSendError(data.error || `Error ${res.status} enviando los mails`);
      } else {
        setSendResult(data);
      }
    } catch (err) {
      setSendError(String(err));
    } finally {
      setSending(false);
    }
  };

  const toggleExcluded = (i: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal campaign-modal reporte-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reporte-title"
      >
        <header className="modal-header">
          <h2 id="reporte-title">Reporte mensual</h2>
          <div className="modal-header-actions">
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        <div className="campaign-body">
          <p className="campaign-intro">
            Copiá las filas de la pestaña del mes en "Emprendedores Balance" (Google Sheets) —
            seleccioná desde el encabezado hasta la última fila con datos y pegalas acá. Se cruzan
            por Instagram (o por nombre de emprendimiento) con los miembros activos del CRM.
          </p>

          <label className="campaign-tag-label">
            Mes (para el asunto del mail)
            <input value={mes} onChange={(e) => setMes(e.target.value)} placeholder="Julio 2026" />
          </label>

          <label className="campaign-tag-label">
            Datos pegados desde Google Sheets
            <textarea
              rows={6}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="MAILS	INSTAGRAM	EMPRENDIMIENTO	Alquiler	Ventas	DEUDA	COMISION..."
            />
          </label>

          {filas.length > 0 && (
            <div className="import-table-wrap campaign-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Nombre</th>
                    <th>Mail</th>
                    <th>Detalle del mes</th>
                    <th>Incluir</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ i, fila, lead, email }) => (
                    <tr key={i} className={lead ? "" : "import-row-off"}>
                      <td>{lead ? "✅" : "⚠"}</td>
                      <td>{lead?.nombre || fila.emprendimiento || <span className="import-empty">—</span>}</td>
                      <td>
                        <input
                          className="tasks-add-input"
                          value={email}
                          placeholder="mail@..."
                          onChange={(e) =>
                            setEmailOverrides((prev) => ({ ...prev, [i]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="import-notas">
                        {Object.entries(fila.campos).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!excluded.has(i)}
                          disabled={!lead || !email.trim()}
                          onChange={() => toggleExcluded(i)}
                        />
                      </td>
                      <td>
                        {lead && lead.telefono && (
                          <a
                            className="lead-card-whatsapp campaign-wa"
                            href={whatsappUrl(lead.telefono, reporteEnviadoMensaje(lead.nombre))}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              onSendWhatsapp(lead.id);
                              setWspSent((prev) => new Set(prev).add(i));
                            }}
                            title="Avisar por WhatsApp que el reporte fue enviado por mail"
                            aria-label="Enviar WhatsApp"
                          >
                            {wspSent.has(i) ? "✅" : "💬"}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sendResult && (
            <p className="campaign-result">
              ✅ Se enviaron {sendResult.sent} de {sendResult.total} mails.
              {sendResult.results.some((r) => !r.ok) && (
                <> Fallaron: {sendResult.results.filter((r) => !r.ok).map((r) => r.to).join(", ")}</>
              )}
            </p>
          )}
          {sendError && <p className="contacts-migration-error">Error: {sendError}</p>}
        </div>

        <footer className="modal-footer">
          <span className="campaign-summary">
            {matchedCount} de {filas.length} encontrados en el CRM
            {toSend.length > 0 && ` · ${toSend.length} listos para enviar`}
          </span>
          <div className="modal-footer-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={emailsDesactualizados.length === 0}
              onClick={actualizarMails}
            >
              Actualizar mails en el CRM ({emailsDesactualizados.length})
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={toSend.length === 0 || sending}
              onClick={enviarMails}
            >
              {sending ? "Enviando…" : `Enviar reporte por mail a ${toSend.length}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
