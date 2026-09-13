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

let worker = context.serviceWorkers()[0];
if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 15000 });
await worker.evaluate(() => chrome.storage.local.remove("mcw-queue-seen"));
console.log("Storage de 'ya vistos' limpiado.");

await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://web.whatsapp.com" });

const page = context.pages()[0] ?? (await context.newPage());
await page.goto("https://web.whatsapp.com");
await page.waitForSelector("#pane-side", { timeout: 60000 });
await page.waitForTimeout(3000);

const initial = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  if (!host || !host.shadowRoot) return "no-host";
  const bar = host.shadowRoot.querySelector(".mcw-queuebar");
  return bar ? bar.textContent : "no-queuebar";
});
console.log("Estado inicial de la cola:", initial);

const clicked = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const btn = [...host.shadowRoot.querySelectorAll(".mcw-btn")].find((b) => b.textContent?.includes("Siguiente"));
  if (!btn) return "no-btn";
  btn.click();
  return "clicked";
});
console.log("Click en Siguiente:", clicked);

await page.waitForTimeout(2000);

const target = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const box = host.shadowRoot.querySelector(".mcw-queuebar-target");
  return box ? box.textContent : null;
});
console.log("Info mostrada del siguiente lead:", target);

await page.screenshot({ path: path.join(__dirname, "queue_test.png") });
await context.close();
