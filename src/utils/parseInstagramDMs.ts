import type { Lead } from "../types";

// Instagram encodes UTF-8 text as Latin-1 in data exports — this fixes mojibake
function fixEncoding(str: string): string {
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

interface IGThread {
  participants?: { name: string }[];
  title?: string;
  thread_path?: string;
  thread_type?: string;
}

export function parseInstagramDMs(jsonTexts: string[]): Partial<Lead>[] {
  const seen = new Map<string, Partial<Lead>>();

  for (const text of jsonTexts) {
    try {
      const data = JSON.parse(text) as IGThread;

      // Skip group conversations
      if (data.thread_type === "RegularGroup") continue;

      // Username lives in thread_path: "inbox/username_1234567890"
      const pathMatch = (data.thread_path ?? "").match(/inbox\/([a-zA-Z0-9._]+)_\d+/);
      const username = pathMatch?.[1] ?? "";

      const displayName = data.title ? fixEncoding(data.title) : "";

      if (!username && !displayName) continue;

      const key = username || displayName.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { nombre: displayName, instagram: username });
      }
    } catch {
      // skip malformed files
    }
  }

  return Array.from(seen.values());
}
