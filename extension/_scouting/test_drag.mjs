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

// Arrastrar la cola desde su agarradera
const box = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  const handle = host.shadowRoot.querySelector(".mcw-queuebar .mcw-drag-handle");
  const rect = handle.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
});

await page.mouse.move(box.x, box.y);
await page.mouse.down();
await page.mouse.move(box.x - 300, box.y + 250, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(500);

await page.screenshot({ path: path.join(__dirname, "drag_test.png") });
console.log("Screenshot guardado.");
await context.close();
