export const SHORTCUT_IDS = [
  "overview",
  "timeline",
  "documents",
  "chat",
  "settings",
  "newResult",
  "focusPrompt",
  "lockDatabase",
  "closeDatabase",
] as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[number];
export type ShortcutMap = Record<ShortcutId, string>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  overview: "Mod+1",
  timeline: "Mod+2",
  documents: "Mod+3",
  chat: "Mod+4",
  settings: "Mod+,",
  newResult: "Mod+N",
  focusPrompt: "Mod+K",
  lockDatabase: "Mod+L",
  closeDatabase: "Mod+Shift+W",
};

const VALID_KEYS = new Set([",", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")]);

export function normalizeShortcuts(value: Partial<Record<ShortcutId, unknown>> | undefined): ShortcutMap {
  return Object.fromEntries(SHORTCUT_IDS.map((id) => {
    const candidate = value?.[id];
    return [id, typeof candidate === "string" && isValidShortcut(candidate) ? candidate : DEFAULT_SHORTCUTS[id]];
  })) as ShortcutMap;
}

export function isValidShortcut(value: string): boolean {
  const parts = value.split("+");
  if (parts.length < 2 || parts[0] !== "Mod") return false;
  const key = parts.at(-1) || "";
  return VALID_KEYS.has(key) && parts.slice(1, -1).every((part) => part === "Shift" || part === "Alt");
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (!(event.metaKey || event.ctrlKey) || event.key === "Control" || event.key === "Meta") return null;
  const key = event.key === "," ? "," : event.key.toUpperCase();
  if (!VALID_KEYS.has(key)) return null;
  return ["Mod", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : "", key].filter(Boolean).join("+");
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string, isMac: boolean): boolean {
  if (!isValidShortcut(shortcut)) return false;
  const parts = shortcut.split("+");
  const key = parts.at(-1);
  if (!key) return false;
  const primaryDown = isMac ? event.metaKey : event.ctrlKey;
  const primaryOtherDown = isMac ? event.ctrlKey : event.metaKey;
  return primaryDown && !primaryOtherDown && event.altKey === parts.includes("Alt") && event.shiftKey === parts.includes("Shift") && event.key.toUpperCase() === key;
}

export function formatShortcut(shortcut: string, isMac: boolean): string {
  return shortcut.split("+").map((part) => {
    if (part === "Mod") return isMac ? "⌘" : "Ctrl";
    if (part === "Shift") return isMac ? "⇧" : "Shift";
    if (part === "Alt") return isMac ? "⌥" : "Alt";
    return part === "," ? "Comma" : part;
  }).join(isMac ? " " : "+");
}
