import { todayString } from "./dashboard-format";
import type { ExtractedResult } from "./dashboard-model";

/** Codex CLI receives file bytes through Tauri IPC; keep payloads bounded. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

export function createEmptyExtractedResult(organKey: string): ExtractedResult {
  return {
    id: newId(),
    organKey,
    marker: "",
    value: "",
    unit: "",
    referenceRange: "",
    status: "",
    measuredAt: todayString(),
    notes: "",
  };
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
