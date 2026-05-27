import type { Lead } from "../types";

// Android: "20/05/2024, 14:30 - Contact: message"
// iOS:     "[20/5/2024, 2:30:00 PM] Contact: message"
const LINE_RE =
  /^(?:\[[\d/ ,:.APMapm]+\]|[\d/]+,?\s+[\d:APMapm]+ -)\s+([^:]+):\s/;

const SKIP = [
  "end-to-end encrypted",
  "cifrad",
  "security code",
  "código de seguridad",
  "created group",
  "you were added",
  "image omitted",
  "audio omitted",
  "video omitted",
  "sticker omitted",
  "document omitted",
  "left",
];

function isSystem(msg: string): boolean {
  const l = msg.toLowerCase();
  return SKIP.some((p) => l.includes(p));
}

export function parseWhatsAppChat(text: string): Partial<Lead>[] {
  const seen = new Map<string, boolean>(); // name -> isPhone

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const contact = m[1].trim();
    const rest = line.slice(line.indexOf(contact) + contact.length + 1).trim();
    if (!contact || isSystem(rest)) continue;
    if (!seen.has(contact)) {
      seen.set(contact, /^[\d\s+()\-]+$/.test(contact));
    }
  }

  return Array.from(seen.entries()).map(([contact, isPhone]) => ({
    nombre: isPhone ? "" : contact,
    telefono: isPhone ? contact : "",
  }));
}
