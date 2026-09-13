// Prueba descartable: carga la extension real (extension/dist) en Chromium
// y confirma que el content script se inyecta en web.whatsapp.com.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(__dirname, "..", "dist");
const userDataDir = path.join(__dirname, ".chrome-profile");

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

const page = context.pages()[0] ?? (await context.newPage());
page.on("console", (msg) => console.log("[page console]", msg.text()));

await page.goto("https://web.whatsapp.com");
console.log("Pagina cargada, esperando a que cargue la lista...");
await page.waitForSelector("#pane-side", { timeout: 60000 });
await page.waitForTimeout(1500);

// Abrir el primer chat de la lista (uno con numero sin guardar, segun la captura anterior)
const primerChatSinGuardar = page.locator('span[title^="+54"]').first();
if (await primerChatSinGuardar.count()) {
  await primerChatSinGuardar.click();
  console.log("Chat abierto.");
} else {
  console.log("No encontre un chat con numero sin guardar, dejo el default.");
}

await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(__dirname, "panel_screenshot.png") });

// Probar crear un recordatorio de "5 min" haciendo clic en el chip real del panel (shadow DOM)
const clicked = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  if (!host || !host.shadowRoot) return "no-host";
  const chips = [...host.shadowRoot.querySelectorAll(".mcw-chip")];
  const chip5min = chips.find((c) => c.textContent?.includes("5 min"));
  if (!chip5min) return "no-chip";
  chip5min.click();
  return "clicked";
});
console.log("Click en chip 5min:", clicked);
await page.waitForTimeout(1500);

// Probar agregar un tag de prueba
const tagResult = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  if (!host || !host.shadowRoot) return "no-host";
  const input = host.shadowRoot.querySelector(".mcw-input");
  const btn = [...host.shadowRoot.querySelectorAll(".mcw-btn")].find((b) => b.textContent?.includes("+ Tag"));
  if (!input || !btn) return "no-input-or-btn";
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "🧪 test-extension");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  btn.click();
  return "tag-clicked";
});
console.log("Click en +Tag:", tagResult);
await page.waitForTimeout(1500);

await page.screenshot({ path: path.join(__dirname, "panel_after_actions.png") });
console.log("Screenshot final guardado. Cerrando.");
await context.close();
