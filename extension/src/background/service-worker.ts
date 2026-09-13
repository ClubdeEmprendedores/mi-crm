import { supabase } from "../lib/supabaseClient";

const ALARM_NAME = "mcw-check-tasks";
const STORAGE_KEY = "mcw-notif-links";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});

type DueTask = {
  id: string;
  texto: string;
  lead_id: string | null;
};

async function checkDueTasks() {
  const nowIso = new Date().toISOString();
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,texto,lead_id")
    .eq("hecha", false)
    .eq("notificado", false)
    .lte("fecha_vencimiento", nowIso)
    .not("fecha_vencimiento", "is", null);

  if (error || !tasks || tasks.length === 0) return;

  const leadIds = [...new Set((tasks as DueTask[]).map((t) => t.lead_id).filter(Boolean))] as string[];
  let telefonoPorLead: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await supabase.from("leads").select("id,telefono").in("id", leadIds);
    telefonoPorLead = Object.fromEntries((leads ?? []).map((l: { id: string; telefono: string }) => [l.id, l.telefono]));
  }

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const links: Record<string, string> = (stored[STORAGE_KEY] as Record<string, string> | undefined) ?? {};

  for (const task of tasks as DueTask[]) {
    const telefono = task.lead_id ? telefonoPorLead[task.lead_id] : undefined;
    const digits = telefono ? telefono.replace(/\D/g, "") : null;
    if (digits) links[task.id] = digits;

    chrome.notifications.create(task.id, {
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      title: "Recordatorio de seguimiento",
      message: task.texto,
      priority: 2,
    });

    await supabase.from("tasks").update({ notificado: true }).eq("id", task.id);
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: links });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkDueTasks();
});

// Util para debugging/tests: forzar una verificacion inmediata sin esperar el alarm.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "mcw-force-check") {
    checkDueTasks().then(() => sendResponse({ ok: true }));
    return true; // respuesta async
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const links: Record<string, string> = (stored[STORAGE_KEY] as Record<string, string> | undefined) ?? {};
  const digits = links[notificationId];
  const url = digits ? `https://web.whatsapp.com/send?phone=${digits}` : "https://web.whatsapp.com";

  const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { url, active: true });
    if (tabs[0].windowId) await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }

  chrome.notifications.clear(notificationId);
  delete links[notificationId];
  await chrome.storage.local.set({ [STORAGE_KEY]: links });
});

// Expuesto para poder forzar la verificacion desde tests con Playwright
// (context.serviceWorkers()[0].evaluate(() => self.mcwCheckDueTasks())).
(self as unknown as { mcwCheckDueTasks: typeof checkDueTasks }).mcwCheckDueTasks = checkDueTasks;

console.log("[mi-crm-wsp] service worker iniciado");
