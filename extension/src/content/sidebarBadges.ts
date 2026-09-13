import { supabase } from "../lib/supabaseClient";
import { last10 } from "./phone";
import { getEstadoConversacion, ESTADO_CONVERSACION_COLORS } from "../../../src/utils/conversacion";
import type { HistorialEntry } from "../../../src/types";

type LeadRow = {
  telefono: string;
  historial: HistorialEntry[] | null;
  ultimo_mensaje_en: string | null;
};

const BADGE_ATTR = "data-mcw-badged";
const PHONE_RE = /^\+\d[\d\s-]{8,}\d$/;

function findPhoneSpans(): HTMLElement[] {
  const pane = document.getElementById("pane-side");
  if (!pane) return [];
  return [...pane.querySelectorAll<HTMLElement>("span[title]")].filter(
    (el) => !el.hasAttribute(BADGE_ATTR) && PHONE_RE.test(el.getAttribute("title") || ""),
  );
}

function makeDot(color: string): HTMLSpanElement {
  const dot = document.createElement("span");
  dot.style.display = "inline-block";
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "50%";
  dot.style.marginRight = "5px";
  dot.style.flexShrink = "0";
  dot.style.background = color;
  dot.setAttribute("data-mcw-dot", "1");
  return dot;
}

let pending = false;

export function scheduleSidebarBadgeUpdate() {
  if (pending) return;
  pending = true;
  setTimeout(async () => {
    pending = false;
    await updateSidebarBadges();
  }, 800);
}

async function updateSidebarBadges() {
  const spans = findPhoneSpans();
  if (spans.length === 0) return;

  const entries = spans.map((span) => ({
    span,
    key: last10(span.getAttribute("title") || ""),
  }));

  const orFilter = [...new Set(entries.map((e) => e.key))]
    .filter((k) => k.length === 10)
    .map((k) => `telefono.ilike.%${k}%`)
    .join(",");
  if (!orFilter) return;

  const { data, error } = await supabase
    .from("leads")
    .select("telefono,historial,ultimo_mensaje_en")
    .or(orFilter);
  if (error || !data) return;

  const byLast10 = new Map<string, LeadRow>();
  for (const row of data as LeadRow[]) {
    byLast10.set(last10(row.telefono), row);
  }

  for (const { span, key } of entries) {
    span.setAttribute(BADGE_ATTR, "1");
    const lead = byLast10.get(key);
    if (!lead) continue;
    const estado = getEstadoConversacion({
      historial: lead.historial ?? [],
      ultimoMensajeEn: lead.ultimo_mensaje_en ?? undefined,
    });
    const color = ESTADO_CONVERSACION_COLORS[estado];
    const row = span.closest('div[role="listitem"], div[role="row"]') as HTMLElement | null;
    const titleContainer = row?.querySelector('span[title]')?.parentElement ?? span.parentElement;
    if (titleContainer && !titleContainer.querySelector('[data-mcw-dot]')) {
      titleContainer.insertBefore(makeDot(color), titleContainer.firstChild);
    }
  }
}
