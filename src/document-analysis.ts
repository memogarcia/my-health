import { todayString } from "./dashboard-format";
import { defaultOrgans, type ExtractedResult, type ExtractedResultStatus, type HealthStatus } from "./dashboard-model";

const VALID_ORGANS = new Set(defaultOrgans.map((organ) => organ.key));
const VALID_STATUSES = new Set<HealthStatus>(["normal", "monitor", "attention"]);
const MAX_RESULTS = 30;

/** Codex CLI receives file bytes through Tauri IPC; keep payloads bounded. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

/**
 * Parses the raw Codex output from `analyze_document` into editable result
 * rows. Codex is told to return a JSON array, but it often wraps the array in
 * prose or markdown fences, so the parser scans for the first balanced `[...]`
 * span and coerces each element into the ExtractedResult shape. Anything it
 * cannot understand is dropped rather than thrown, so the review form still
 * opens with whatever was recoverable.
 */
export function parseExtractedResults(raw: string, fallbackOrgan = "blood"): ExtractedResult[] {
  const json = extractJsonArray(raw);
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => normalizeExtractedResult(item, fallbackOrgan))
    .filter((result): result is ExtractedResult => result !== null)
    .slice(0, MAX_RESULTS);
}

export function createEmptyExtractedResult(organKey: string): ExtractedResult {
  return {
    id: newId(),
    organKey,
    marker: "",
    value: "",
    unit: "",
    referenceRange: "",
    status: "normal",
    measuredAt: todayString(),
    notes: "",
  };
}

function normalizeExtractedResult(value: unknown, fallbackOrgan: string): ExtractedResult | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const marker = str(entry.marker) || str(entry.name) || str(entry.test);
  if (!marker) return null;
  return {
    id: newId(),
    organKey: normalizeOrgan(entry.organKey ?? entry.organ, fallbackOrgan),
    marker,
    value: str(entry.value) || str(entry.result),
    unit: str(entry.unit) || str(entry.units),
    referenceRange:
      str(entry.referenceRange) ||
      str(entry.reference_range) ||
      str(entry.range) ||
      str(entry.refRange),
    status: normalizeStatus(entry.status),
    measuredAt: normalizeDate(entry.measuredAt ?? entry.date ?? entry.measured_at ?? entry.collectedAt),
    notes: str(entry.notes) || str(entry.note) || str(entry.comment),
  };
}

/** Finds the first balanced JSON array span, ignoring brackets inside strings. */
function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < raw.length; index++) {
    const ch = raw[index];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }
  return null;
}

function normalizeOrgan(value: unknown, fallback: string): string {
  const key = str(value).toLowerCase();
  return key && VALID_ORGANS.has(key) ? key : fallback;
}

function normalizeStatus(value: unknown): ExtractedResultStatus {
  const key = str(value).toLowerCase();
  return key && VALID_STATUSES.has(key as HealthStatus) ? (key as HealthStatus) : "";
}

function normalizeDate(value: unknown): string {
  const raw = str(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/u.test(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
}

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
