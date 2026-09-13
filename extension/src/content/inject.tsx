import { createRoot } from "react-dom/client";
import { Panel } from "./Panel";
import { QueueBar } from "./QueueBar";
import { scheduleSidebarBadgeUpdate } from "./sidebarBadges";

const PANEL_CSS = `
  :host { all: initial; }
  .mcw-queuebar {
    position: fixed;
    top: 12px;
    right: 12px;
    width: 300px;
    background: #202c33;
    color: #e9edef;
    border: 1px solid #2a3942;
    border-radius: 8px;
    padding: 10px 12px;
    font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
    font-size: 12px;
    z-index: 999999;
    box-shadow: 0 4px 16px rgba(0,0,0,.4);
  }
  .mcw-queuebar .mcw-row { margin-top: 6px; }
  .mcw-queuebar-target { background: #111b21; border-radius: 4px; padding: 6px 8px; margin-top: 6px; line-height: 1.5; }
  .mcw-copy-btn {
    background: #2a3942; color: #e9edef; border: none; border-radius: 4px;
    padding: 2px 6px; font-size: 11px; cursor: pointer;
  }
  .mcw-copy-btn:hover { background: #384852; }
  .mcw-drag-handle { cursor: move; user-select: none; }
  .mcw-drag-handle:active { cursor: grabbing; }
  .mcw-panel {
    position: fixed;
    top: 128px;
    right: 12px;
    width: 300px;
    max-height: calc(100vh - 156px);
    overflow-y: auto;
    background: #111b21;
    color: #e9edef;
    border: 1px solid #2a3942;
    border-radius: 8px;
    padding: 12px;
    font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    box-shadow: 0 4px 16px rgba(0,0,0,.4);
  }
  .mcw-empty { color: #8696a0; padding: 8px 0; }
  .mcw-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .mcw-etapa { font-size: 11px; background: #2a3942; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
  .mcw-estado { padding: 4px 8px; border-radius: 4px; color: #111b21; font-weight: 600; margin-bottom: 6px; }
  .mcw-ultimo { color: #8696a0; font-size: 11px; margin-bottom: 10px; }
  .mcw-section { margin-top: 10px; border-top: 1px solid #2a3942; padding-top: 8px; }
  .mcw-section-title { font-weight: 600; margin-bottom: 6px; color: #00a884; font-size: 11px; text-transform: uppercase; }
  .mcw-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .mcw-tag { background: #2a3942; padding: 2px 6px; border-radius: 10px; font-size: 11px; }
  .mcw-row { display: flex; gap: 6px; }
  .mcw-wrap { flex-wrap: wrap; }
  .mcw-input, .mcw-textarea {
    flex: 1; background: #202c33; color: #e9edef; border: 1px solid #2a3942;
    border-radius: 4px; padding: 6px; font-size: 12px; font-family: inherit;
  }
  .mcw-textarea { width: 100%; resize: vertical; }
  .mcw-btn {
    background: #2a3942; color: #e9edef; border: none; border-radius: 4px;
    padding: 6px 10px; font-size: 12px; cursor: pointer;
  }
  .mcw-btn:hover { background: #384852; }
  .mcw-btn-primary { background: #00a884; color: #111b21; font-weight: 600; width: 100%; }
  .mcw-btn-primary:hover { background: #06cf9c; }
  .mcw-btn-danger { background: transparent; color: #f87171; border: 1px solid #f87171; width: 100%; margin-top: 6px; }
  .mcw-btn-danger:hover { background: rgba(248, 113, 113, 0.12); }
  .mcw-chip {
    background: #202c33; color: #e9edef; border: 1px solid #2a3942; border-radius: 12px;
    padding: 4px 8px; font-size: 11px; cursor: pointer;
  }
  .mcw-chip:hover { background: #2a3942; }
  .mcw-ok { color: #00a884; font-size: 11px; margin-top: 4px; }
  .mcw-historial { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
  .mcw-historial-item { font-size: 11px; color: #d1d7db; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #202c33; padding-bottom: 4px; }
  .mcw-historial-fecha { color: #8696a0; }
`;

function getHeaderText(): string | null {
  const header = document.querySelector('div[id="main"] header');
  return header ? (header as HTMLElement).innerText : null;
}

function mount() {
  const hostId = "mcw-host";
  if (document.getElementById(hostId)) return;

  const host = document.createElement("div");
  host.id = hostId;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = PANEL_CSS;
  shadow.appendChild(style);

  const rootEl = document.createElement("div");
  shadow.appendChild(rootEl);
  const root = createRoot(rootEl);

  let lastHeaderText: string | null | undefined = undefined; // undefined = todavia no renderizo nunca

  function render() {
    const headerText = getHeaderText();
    if (headerText === lastHeaderText) return;
    lastHeaderText = headerText;
    const phoneMatch = headerText?.match(/\+\d[\d\s-]{8,}\d/) ?? null;
    root.render(
      <>
        <QueueBar currentPhone={phoneMatch ? phoneMatch[0] : null} />
        <Panel headerText={headerText} />
      </>,
    );
  }

  render();
  scheduleSidebarBadgeUpdate();

  const observer = new MutationObserver(() => {
    render();
    scheduleSidebarBadgeUpdate();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// WhatsApp Web es una SPA que tarda en montar #app — reintentar hasta que exista.
const waitForApp = setInterval(() => {
  if (document.getElementById("app")) {
    clearInterval(waitForApp);
    mount();
  }
}, 500);

console.log("[mi-crm-wsp] content script cargado en", location.href);
