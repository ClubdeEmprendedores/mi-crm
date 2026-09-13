// Script descartable de reconocimiento — NO forma parte del build final.
// Lanza Chromium persistente contra web.whatsapp.com y va imprimiendo
// hallazgos sobre como extraer el JID/telefono del chat abierto.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.join(__dirname, ".chrome-profile");

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto("https://web.whatsapp.com");
log("Pagina cargada. Esperando login (escaneá el QR si aparece)...");

await page.waitForSelector("#pane-side", { timeout: 5 * 60 * 1000 });
log("LOGUEADO. Lista de chats detectada (#pane-side).");
log("Ahora abrí cualquier chat con mensajes en la ventana del navegador.");

let lastReported = null;

async function extractOnce() {
  return page.evaluate(() => {
    const header = document.querySelector('div[id="main"] header');
    if (!header) return { ok: false, reason: "no-header" };

    // Estrategia A: data-id en los mensajes del chat abierto (formato
    // "<fromMe:true|false>_<chatJid>_<messageId>" o con sufijo de participante).
    const msgIds = [...document.querySelectorAll("[data-id]")]
      .map((el) => el.getAttribute("data-id"))
      .filter(Boolean);
    const chatJidsFromMsgs = [
      ...new Set(
        msgIds
          .map((id) => {
            const m = id.match(/^(?:true|false)_([^_]+)_/);
            return m ? m[1] : null;
          })
          .filter(Boolean),
      ),
    ];

    // Estrategia B: item activo en la lista de chats (aria-selected / clase resaltada)
    const activeListItem = document.querySelector(
      '#pane-side [aria-selected="true"], #pane-side div[role="row"].active',
    );
    let listItemDataId = null;
    if (activeListItem) {
      const withDataId = activeListItem.querySelector("[data-id]") || activeListItem.closest("[data-id]");
      listItemDataId = withDataId ? withDataId.getAttribute("data-id") : null;
    }

    // Estrategia C: parsear el numero de telefono directo del texto visible del header
    // (funciona cuando el contacto no esta guardado con nombre y WA muestra "+54 9 11 ...")
    const headerText = header.innerText;
    const phoneMatch = headerText.match(/\+\d[\d\s-]{8,}/);

    // Estrategia D: buscar el numero en cualquier parte de la pantalla visible
    // (util cuando el panel de "Datos del contacto" esta abierto al costado)
    const appText = document.getElementById("app")?.innerText ?? "";
    const anyPhoneMatches = [...new Set((appText.match(/\+\d[\d\s-]{8,}\d/g) || []))];

    return {
      ok: true,
      headerText: headerText.slice(0, 120),
      phoneFromHeaderText: phoneMatch ? phoneMatch[0] : null,
      anyPhoneMatchesOnScreen: anyPhoneMatches,
      sampleMsgDataIds: msgIds.slice(0, 3),
      chatJidsFromMsgs,
      listItemDataId,
    };
  });
}

// Poll cada 2s e imprime cuando cambia el resultado (o sea, cuando cambiás de chat)
setInterval(async () => {
  try {
    const result = await extractOnce();
    const key = JSON.stringify(result);
    if (key !== lastReported) {
      lastReported = key;
      log("RESULTADO:", JSON.stringify(result, null, 2));
    }
  } catch (e) {
    // pagina pudo haber navegado, ignorar error transitorio
  }
}, 2000);
