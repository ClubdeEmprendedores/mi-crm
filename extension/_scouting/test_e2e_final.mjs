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

const waPage = context.pages()[0] ?? (await context.newPage());
await waPage.goto("https://web.whatsapp.com");
await waPage.waitForSelector("#pane-side", { timeout: 60000 });
await waPage.waitForTimeout(1500);

const chat = waPage.locator('span[title="+54 9 11 3650-5211"]').first();
await chat.click();
await waPage.waitForTimeout(3000);

const TAG = "✅ Verificado extensión";
const result = await waPage.evaluate((tag) => {
  const host = document.getElementById("mcw-host");
  if (!host || !host.shadowRoot) return "no-host";
  const input = host.shadowRoot.querySelector(".mcw-input");
  const btn = [...host.shadowRoot.querySelectorAll(".mcw-btn")].find((b) => b.textContent?.includes("+ Tag"));
  if (!input || !btn) return "no-input-or-btn";
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, tag);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  btn.click();
  return "ok";
}, TAG);
console.log("Tag agregado desde el panel:", result);
await waPage.waitForTimeout(1500);

// Abrir el CRM web normal en otra pestaña y buscar el lead
const crmPage = await context.newPage();
await crmPage.goto("http://localhost:5173");
await crmPage.waitForTimeout(2000);

const searchBox = crmPage.locator('input[type="text"], input[type="search"]').first();
if (await searchBox.count()) {
  await searchBox.fill("acilegnanoel2521");
  await crmPage.waitForTimeout(1500);
}

const bodyText = await crmPage.evaluate(() => document.body.innerText);
const tagVisibleEnCRM = bodyText.includes(TAG);
console.log("Tag visible en el CRM web:", tagVisibleEnCRM);

await crmPage.screenshot({ path: path.join(__dirname, "crm_verificacion.png") });

await context.close();
