import * as XLSX from "xlsx";
import type { Lead } from "../types";

type RawRow = Record<string, unknown>;

const COL_PATTERNS: [keyof Lead, RegExp][] = [
  ["nombre", /nombre|name|contacto|contact|cliente|client/i],
  ["empresa", /empresa|company|organiza|org\b/i],
  ["email", /e?mail|correo/i],
  ["telefono", /tel[eé]?f?ono|phone|cel(ular)?|mobile|whatsapp|wsp/i],
  ["instagram", /instagram|ig\b|redes/i],
  ["notas", /nota|note|comentar|comment|observac/i],
];

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function detectField(header: string): keyof Lead | null {
  const norm = normalize(header);
  for (const [field, pattern] of COL_PATTERNS) {
    if (pattern.test(norm)) return field;
  }
  return null;
}

export async function parseExcelFile(file: File): Promise<Partial<Lead>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const mapping: Record<string, keyof Lead> = {};
  for (const h of headers) {
    const field = detectField(h);
    if (field && !(field in Object.values(mapping))) mapping[h] = field;
  }

  return rows
    .map((row) => {
      const lead: Partial<Lead> = {};
      for (const [header, field] of Object.entries(mapping)) {
        const val = String(row[header] ?? "").trim();
        if (val) (lead as Record<string, string>)[field as string] = val;
      }
      return lead;
    })
    .filter((l) => l.nombre || l.telefono || l.email);
}
