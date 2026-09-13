import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(__dirname, "..", "dist");
// Perfil temporal y descartable: este test no necesita sesion de WhatsApp,
// y asi evitamos reusar un service worker viejo cacheado de corridas previas.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcw-test-"));

// Leer credenciales del CRM
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

// Lead real usado en las pruebas anteriores (acilegnanoel2521)
const LEAD_ID = "e0563eb1-525d-40ad-9937-3bf9c8c27a16";

const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
  method: "POST",
  headers: { ...HEADERS, Prefer: "return=representation" },
  body: JSON.stringify({
    texto: "Seguimiento: prueba de notificacion",
    hecha: false,
    lead_id: LEAD_ID,
    fecha_vencimiento: new Date(Date.now() - 60_000).toISOString(), // vencida hace 1 min
    notificado: false,
  }),
});
const [insertedTask] = await insertRes.json();
console.log("Tarea de prueba creada:", insertedTask.id);

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

console.log("Esperando a que registre el service worker...");
let worker = context.serviceWorkers()[0];
if (!worker) {
  worker = await context.waitForEvent("serviceworker", { timeout: 15000 });
}
console.log("Service worker listo:", worker.url());

const diag = await worker.evaluate(() => ({
  hasFn: typeof self.mcwCheckDueTasks,
  keys: Object.keys(self).filter((k) => k.toLowerCase().includes("mcw")),
}));
console.log("Diagnostico self:", diag);

// Forzar la verificacion de tareas vencidas
const result = await worker.evaluate(async () => {
  // @ts-ignore
  await self.mcwCheckDueTasks();
  return "listo";
});
console.log("checkDueTasks resultado:", result);

await new Promise((r) => setTimeout(r, 2000));

// Confirmar que la tarea quedo marcada como notificada
const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${insertedTask.id}&select=notificado`, { headers: HEADERS });
const [checkRow] = await checkRes.json();
console.log("notificado en DB:", checkRow.notificado);

// Limpieza: borrar la tarea de prueba
await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${insertedTask.id}`, { method: "DELETE", headers: HEADERS });
console.log("Tarea de prueba borrada.");

await context.close();
fs.rmSync(userDataDir, { recursive: true, force: true });
