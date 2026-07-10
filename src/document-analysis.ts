import { todayString } from "./dashboard-format";
import { defaultOrgans, type ExtractedResult, type ExtractedResultStatus } from "./dashboard-model";

const VALID_ORGANS = new Set(defaultOrgans.map((organ) => organ.key));
const VALID_STATUSES = new Set<ExtractedResultStatus>(["normal", "monitor", "attention"]);
const MAX_RESULTS = 30;

export type ExtractedResultField = "marker" | "value" | "measuredAt" | "status";

/** Document bytes cross the Tauri trust boundary; keep IPC payloads bounded. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

export function parseExtractedResults(raw: string, fallbackOrgan = "blood", fallbackDate = todayString()): ExtractedResult[] {
  const parsed = parseJson(raw);
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { results?: unknown }).results)
      ? (parsed as { results: unknown[] }).results
      : [];
  const defaultDate = normalizeDate(fallbackDate) || todayString();
  return values
    .map((value) => normalizeExtractedResult(value, fallbackOrgan, defaultDate))
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
    status: "",
    measuredAt: todayString(),
    notes: "",
  };
}

export function missingExtractedResultFields(result: ExtractedResult): ExtractedResultField[] {
  const missing: ExtractedResultField[] = [];
  if (!result.marker.trim()) missing.push("marker");
  if (!result.value.trim()) missing.push("value");
  if (!result.measuredAt) missing.push("measuredAt");
  if (!result.status) missing.push("status");
  return missing;
}

function normalizeExtractedResult(value: unknown, fallbackOrgan: string, fallbackDate: string): ExtractedResult | null {
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
    referenceRange: str(entry.referenceRange) || str(entry.reference_range) || str(entry.range),
    status: normalizeStatus(entry.status) || normalizeStatus(entry.followUpPriority) || normalizeStatus(entry.priority),
    measuredAt: normalizeDate(
      entry.measuredAt
        ?? entry.date
        ?? entry.measured_at
        ?? entry.collectedAt
        ?? entry.collectionDate
        ?? entry.reportDate
        ?? entry.resultDate,
    ) || fallbackDate,
    notes: str(entry.notes) || str(entry.note) || str(entry.comment),
  };
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/u, "").replace(/\s*```$/u, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    const arrayStart = trimmed.indexOf("[");
    const arrayEnd = trimmed.lastIndexOf("]");
    const candidate = objectStart >= 0 && objectEnd > objectStart
      ? trimmed.slice(objectStart, objectEnd + 1)
      : arrayStart >= 0 && arrayEnd > arrayStart
        ? trimmed.slice(arrayStart, arrayEnd + 1)
        : "";
    try {
      return candidate ? JSON.parse(candidate) : null;
    } catch {
      return null;
    }
  }
}

function normalizeOrgan(value: unknown, fallback: string): string {
  const key = str(value).toLowerCase();
  return key && VALID_ORGANS.has(key) ? key : fallback;
}

function normalizeStatus(value: unknown): ExtractedResultStatus {
  const key = str(value).toLowerCase().replace(/[\s_-]+/gu, " ");
  if (VALID_STATUSES.has(key as ExtractedResultStatus)) return key as ExtractedResultStatus;
  if (key === "routine" || key === "no follow up") return "normal";
  if (key === "watch") return "monitor";
  if (key === "discuss soon" || key === "urgent" || key === "critical") return "attention";
  return "";
}

function normalizeDate(value: unknown): string {
  const raw = str(value);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u);
  return slash ? `${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}` : "";
}

function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
