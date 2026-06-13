import type { Contact, Lead } from "../types";
import { PROPUESTA_LABELS, SEDE_LABELS, STAGE_LABELS } from "../types";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["﻿" + content], { type: mimeType + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | undefined | null)[]) {
  return cells.map(csvCell).join(",");
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportLeadsCsv(leads: Lead[]) {
  const header = csvRow([
    "Nombre", "Empresa", "Email", "Teléfono", "Instagram",
    "Etapa", "Propuesta", "Sede",
    "Fecha Contacto", "Fecha Creación", "Notas",
  ]);
  const rows = leads.map((l) =>
    csvRow([
      l.nombre, l.empresa, l.email, l.telefono,
      l.instagram ? `@${l.instagram}` : "",
      STAGE_LABELS[l.etapa],
      l.propuesta ? PROPUESTA_LABELS[l.propuesta] : "",
      l.sede ? SEDE_LABELS[l.sede] : "",
      l.contactadoEn ? l.contactadoEn.slice(0, 10) : "",
      l.creadoEn.slice(0, 10),
      l.notas,
    ]),
  );
  downloadFile(
    [header, ...rows].join("\r\n"),
    `leads-${today()}.csv`,
    "text/csv",
  );
}

export function exportContactsCsv(contacts: Contact[]) {
  const header = csvRow([
    "Nombre", "Empresa", "Email", "Teléfono", "Instagram", "Notas", "Creado",
  ]);
  const rows = contacts.map((c) =>
    csvRow([
      c.nombre, c.empresa, c.email, c.telefono,
      c.instagram ? `@${c.instagram}` : "",
      c.notas,
      c.creadoEn.slice(0, 10),
    ]),
  );
  downloadFile(
    [header, ...rows].join("\r\n"),
    `contactos-${today()}.csv`,
    "text/csv",
  );
}

export function exportFullJson(leads: Lead[], contacts: Contact[]) {
  const data = {
    exportado: new Date().toISOString(),
    version: 1,
    leads,
    contactos: contacts,
  };
  downloadFile(
    JSON.stringify(data, null, 2),
    `crm-backup-${today()}.json`,
    "application/json",
  );
}
