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
await page.goto("https://web.whatsapp.com");
await page.waitForSelector("#pane-side", { timeout: 60000 });
await page.waitForTimeout(2500);

// Abrir el chat guardado "Bari Candles" (con nombre, no numero crudo) para
// replicar exactamente el escenario que fallo.
const chat = page.locator('span[title="Bari Candles"]').first();
if (await chat.count()) {
  await chat.click();
  console.log("Chat de Bari Candles (contacto guardado) abierto.");
} else {
  console.log("No encontre el chat de Bari Candles en la lista visible.");
}
await page.waitForTimeout(2000);

await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const btn = [...host.shadowRoot.querySelectorAll(".mcw-btn")].find((b) => b.textContent?.includes("Siguiente"));
  btn?.click();
});
await page.waitForTimeout(1500);

const beforeMarcar = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const btn = [...host.shadowRoot.querySelectorAll(".mcw-btn")].find((b) => b.textContent?.includes("Enviado"));
  return btn ? { disabled: btn.disabled, texto: btn.textContent } : "no-btn";
});
console.log("Boton Enviado antes de click:", beforeMarcar);

await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const btn = [...host.shadowRoot.querySelectorAll(".mcw-btn")].find((b) => b.textContent?.includes("Enviado"));
  btn?.click();
});
await page.waitForTimeout(2000);

const status = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const ok = host.shadowRoot.querySelector(".mcw-ok");
  const bar = host.shadowRoot.querySelector(".mcw-queuebar");
  return { status: ok?.textContent, total: bar?.querySelector("span")?.textContent };
});
console.log("Resultado:", status);

await context.close();
