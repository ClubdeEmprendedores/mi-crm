import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(__dirname, "..", "dist");
const userDataDir = path.join(__dirname, ".chrome-profile"); // reusar sesion logueada de WA

const envText = fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf-8");
const env = Object.fromEntries(
  envText.split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
    const [k, ...rest] = l.split("=");
    return [k.trim(), rest.join("=").trim()];
  }),
);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };
const LEAD_ID = "e0563eb1-525d-40ad-9937-3bf9c8c27a16"; // acilegnanoel2521, +54 9 11 3650-5211

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
await page.waitForTimeout(1500);

const chat = page.locator('span[title="+54 9 11 3650-5211"]').first();
await chat.click();
console.log("Chat abierto, esperando que cargue el panel...");
await page.waitForTimeout(4000);

const MARCADOR = `Nota editada desde afuera ${Date.now()}`;
console.log("Editando la nota del lead directo por REST (simulando el CRM web)...");
await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${LEAD_ID}`, {
  method: "PATCH",
  headers: { ...HEADERS, Prefer: "return=minimal" },
  body: JSON.stringify({ notas: MARCADOR }),
});

await page.waitForTimeout(3000);

const panelNotas = await page.evaluate(() => {
  const host = document.getElementById("mcw-host");
  if (!host || !host.shadowRoot) return null;
  const ta = host.shadowRoot.querySelector(".mcw-textarea");
  return ta ? ta.value : null;
});
console.log("Notas en el panel despues del update externo:", panelNotas);
console.log("Coincide:", panelNotas === MARCADOR);

// Limpieza: dejar la nota vacia de nuevo
await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${LEAD_ID}`, {
  method: "PATCH",
  headers: { ...HEADERS, Prefer: "return=minimal" },
  body: JSON.stringify({ notas: "" }),
});

await context.close();
