import type { Lead } from "../types";

function decodeQP(s: string): string {
  return s
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractLine(lines: string[], prefix: RegExp): string {
  const line = lines.find((l) => prefix.test(l));
  if (!line) return "";
  const val = line.slice(line.indexOf(":") + 1).trim();
  return /QUOTED-PRINTABLE/i.test(line) ? decodeQP(val) : val;
}

export function parseVCard(text: string): Partial<Lead>[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);

  return cards
    .map((card) => {
      const joined = card.replace(/\r?\n[ \t]/g, "");
      const lines = joined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      const nombre = extractLine(lines, /^FN/i);
      const telefono = extractLine(lines, /^TEL/i);
      const email = extractLine(lines, /^EMAIL/i);
      const orgRaw = extractLine(lines, /^ORG/i);
      const empresa = orgRaw.split(";")[0].trim();
      const noteRaw = extractLine(lines, /^NOTE/i);
      const igMatch = noteRaw.match(/@[\w.]+/);
      const instagram = igMatch ? igMatch[0] : "";

      return { nombre, telefono, email, empresa, notas: noteRaw, instagram };
    })
    .filter((l) => l.nombre || l.telefono);
}
