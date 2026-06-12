import { useMemo, useState } from "react";
import type { Lead } from "../types";
import { formatShortDate } from "../utils/format";
import { SAN_TELMO_CAMPAIGN, SAN_TELMO_TAG, type CampaignEntry } from "../utils/reconexionCampaign";
import { sanTelmoReconexionMensaje, whatsappUrl } from "../utils/whatsapp";

type Props = {
  leads: Lead[];
  onClose: () => void;
  onApplyTag: (id: string, tags: string[]) => void;
  onSendWhatsapp: (id: string) => void;
};

function normalizePhone(s: string) {
  return s.replace(/\D/g, "");
}

export function CampaignModal({ leads, onClose, onApplyTag, onSendWhatsapp }: Props) {
  const [entries, setEntries] = useState<CampaignEntry[]>(SAN_TELMO_CAMPAIGN);
  const [tag, setTag] = useState(SAN_TELMO_TAG);
  const [extraText, setExtraText] = useState("");
  const [applied, setApplied] = useState(0);

  const leadByPhone = useMemo(() => {
    const map = new Map<string, Lead>();
    for (const l of leads) {
      const p = normalizePhone(l.telefono);
      if (p) map.set(p, l);
    }
    return map;
  }, [leads]);

  const rows = entries.map((entry) => ({
    entry,
    lead: leadByPhone.get(normalizePhone(entry.telefono)) ?? null,
  }));

  const matched = rows.filter((r) => r.lead);
  const pending = matched.filter((r) => !r.lead!.tags.includes(tag));

  const addExtra = () => {
    const lines = extraText.split("\n").map((l) => l.trim()).filter(Boolean);
    const newEntries: CampaignEntry[] = [];
    for (const line of lines) {
      const [telefonoRaw, nombre, motivo] = line.split("|").map((p) => p.trim());
      if (!telefonoRaw) continue;
      const telefono = normalizePhone(telefonoRaw);
      if (!telefono) continue;
      if (entries.some((e) => normalizePhone(e.telefono) === telefono)) continue;
      newEntries.push({ telefono, nombre: nombre || "", motivo: motivo || "" });
    }
    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries]);
      setExtraText("");
    }
  };

  const applyAll = () => {
    let count = 0;
    for (const { lead } of pending) {
      if (!lead) continue;
      onApplyTag(lead.id, [...lead.tags, tag]);
      count++;
    }
    setApplied(count);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal campaign-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="campaign-title"
      >
        <header className="modal-header">
          <h2 id="campaign-title">Reconexión: San Telmo</h2>
          <div className="modal-header-actions">
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        <div className="campaign-body">
          <p className="campaign-intro">
            Estas son las conversaciones de WhatsApp donde la persona dijo que San Fernando le
            quedaba lejos, o pidió info de una sede en Capital — antes de que existiera San
            Telmo. Etiquetalos para tenerlos a mano y avisarles que ya abrimos San Telmo.
          </p>

          <label className="campaign-tag-label">
            Etiqueta a aplicar
            <input value={tag} onChange={(e) => setTag(e.target.value)} />
          </label>

          <div className="import-table-wrap campaign-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Motivo</th>
                  <th>Etiquetas actuales</th>
                  <th>Último mensaje</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, lead }) => (
                  <tr key={entry.telefono} className={lead ? "" : "import-row-off"}>
                    <td>{lead ? (lead.tags.includes(tag) ? "✅" : "—") : "⚠"}</td>
                    <td>{lead?.nombre || entry.nombre || <span className="import-empty">—</span>}</td>
                    <td>{entry.telefono}</td>
                    <td className="import-notas">{entry.motivo}</td>
                    <td>
                      {lead ? (
                        lead.tags.length > 0 ? (
                          <div className="lead-card-tags">
                            {lead.tags.map((t) => (
                              <span key={t} className="lead-card-tag">{t}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="import-empty">—</span>
                        )
                      ) : (
                        "no está en el CRM"
                      )}
                    </td>
                    <td>
                      {lead?.ultimoMensajeEn ? formatShortDate(lead.ultimoMensajeEn) : "—"}
                    </td>
                    <td>
                      {lead && (
                        <a
                          className="lead-card-whatsapp campaign-wa"
                          href={whatsappUrl(lead.telefono, sanTelmoReconexionMensaje(lead.nombre))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onSendWhatsapp(lead.id)}
                          title="Enviar WhatsApp"
                          aria-label="Enviar WhatsApp"
                        >
                          💬
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="campaign-add-more">
            <span className="field-label">
              Agregar más contactos (uno por línea: teléfono | nombre | motivo)
            </span>
            <textarea
              rows={3}
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              placeholder="5491100000000 | Nombre | Motivo por el que se lo etiqueta"
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addExtra}>
              + Agregar a la lista
            </button>
          </div>

          {applied > 0 && (
            <p className="campaign-result">
              ✅ Se etiquetaron {applied} lead{applied !== 1 ? "s" : ""} con "{tag}".
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <span className="campaign-summary">
            {matched.length} de {entries.length} encontrados en el CRM
            {pending.length > 0 && ` · ${pending.length} sin etiquetar`}
          </span>
          <div className="modal-footer-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending.length === 0}
              onClick={applyAll}
            >
              Aplicar etiqueta a {pending.length}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
