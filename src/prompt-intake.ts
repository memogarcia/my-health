import type { ExtractedResult, HealthStatus, RegimenInput } from "./dashboard-model";

export type PromptIntakeAction =
  | { kind: "chat" }
  | { kind: "result"; result: ExtractedResult }
  | { kind: "regimen"; input: RegimenInput };

type PromptIntakeOptions = {
  today: string;
  organKey: string;
};

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/u;
const DOSE_RE = /\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?|tablets?|capsules?)\b/iu;
const RESULT_HINT_RE = /\b(result|lab|marker|level|blood pressure|bp|ldl|hdl|glucose|a1c|cholesterol|triglycerides|tsh|crp|hemoglobin|pulse|heart rate)\b/iu;
const REGIMEN_HINT_RE = /\b(add|log|record|save|take|taking|start|starting|begin|began|medication|medicine|prescription|pill|dose|supplement)\b/iu;
const RECORD_INTENT_RE = /^(?:please\s+)?(?:add|log|record|save|track|start|starting|begin|began)\b|^(?:medication|medicine|supplement|lab|result|marker)\s*:/iu;
const QUESTION_RE = /^(?:what|why|how|should|do i|does|can i|could i|is|are|will|would)\b|\?\s*$/iu;
const UNIT_RE = /^(%|mg\/dl|mg\/dL|mmol\/l|ng\/ml|u\/l|iu\/l|mmhg|bpm|kg|lb|lbs)$/iu;

export function promptIntakeFromText(prompt: string, options: PromptIntakeOptions): PromptIntakeAction {
  const text = prompt.trim();
  if (!text) return { kind: "chat" };

  const result = parseResult(text, options);
  if (result) return { kind: "result", result };

  const regimen = parseRegimen(text, options.today);
  if (regimen) return { kind: "regimen", input: regimen };

  return { kind: "chat" };
}

function parseRegimen(text: string, today: string): RegimenInput | null {
  if (!REGIMEN_HINT_RE.test(text)) return null;
  if (QUESTION_RE.test(text) || !RECORD_INTENT_RE.test(text)) return null;

  const duration = durationDays(text);
  const dose = text.match(DOSE_RE);
  const frequency = regimenFrequency(text);
  let name = text
    .replace(/^i(?:'m| am)?\s+(?:going to|gonna|will|plan to)\s+/iu, "")
    .replace(/^(?:please\s+)?(?:add|record|log|start|starting|begin|take|taking)\s+/iu, "")
    .replace(/^(?:medication|medicine|supplement)\s*:\s*/iu, "")
    .replace(/\bfor\s+(?:the\s+)?(?:next\s+)?\d+\s*(?:days?|weeks?|months?)\b.*$/iu, "")
    .replace(/\b(indefinitely|indefinite|ongoing|with no end|without end)\b.*$/iu, "");
  if (dose) name = name.replace(dose[0], "");
  name = name
    .replace(/\b(medication|medicine|prescription|pill|pills|daily|weekly|nightly|morning|evening)\b/giu, "")
    .replace(/\b(once|twice|three times)\s+(?:a\s+)?day\b/giu, "")
    .replace(/\s+/gu, " ")
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/gu, "");
  if (!name) return null;

  const stopDate = duration ? addDays(today, duration) : "";
  return {
    kind: "medication",
    name,
    dose: dose?.[1] || "",
    unit: dose?.[2] || "",
    frequency,
    startDate: today,
    stopDate,
    reason: "",
    notes: text,
    active: !stopDate || stopDate >= today,
  };
}

function parseResult(text: string, options: PromptIntakeOptions): ExtractedResult | null {
  if (!RESULT_HINT_RE.test(text) || QUESTION_RE.test(text) || !RECORD_INTENT_RE.test(text)) return null;
  const normalized = text.replace(/\b(?:is|was|at|=|:)\b/giu, " ");
  const match = normalized.match(/\b([a-z][a-z0-9 /().-]{1,48}?)\s+(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\s*([a-z/%]+(?:\/[a-z]+)?)?\b/iu);
  if (!match) return null;

  const marker = cleanMarker(match[1]);
  if (!marker) return null;
  const rawUnit = match[3] || "";
  const unit = UNIT_RE.test(rawUnit) ? rawUnit : defaultUnit(marker, match[2]);

  return {
    id: newId(),
    organKey: resultOrgan(marker, options.organKey),
    marker,
    value: match[2],
    unit,
    referenceRange: "",
    status: resultStatus(text),
    measuredAt: resultDate(text, options.today),
    notes: text,
  };
}

function durationDays(text: string): number {
  const match = text.match(/\bfor\s+(?:the\s+)?(?:next\s+)?(\d+)\s*(days?|weeks?|months?)\b/iu);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (match[2].toLowerCase().startsWith("week")) return amount * 7;
  if (match[2].toLowerCase().startsWith("month")) return amount * 30;
  return amount;
}

function regimenFrequency(text: string): string {
  const lower = text.toLowerCase();
  if (/\btwice\s+(?:a\s+)?day\b/u.test(lower)) return "Twice daily";
  if (/\bonce\s+(?:a\s+)?day\b/u.test(lower)) return "Daily";
  if (/\b(daily|every day)\b/u.test(lower)) return "Daily";
  if (/\bweekly\b/u.test(lower)) return "Weekly";
  if (/\bnightly\b/u.test(lower)) return "Nightly";
  if (/\bmorning\b/u.test(lower)) return "Morning";
  if (/\bevening\b/u.test(lower)) return "Evening";
  return "";
}

function cleanMarker(value: string): string {
  return value
    .replace(/^(?:please\s+)?(?:add|record|log|my|new|result|lab|marker|level)\s+/giu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function resultStatus(text: string): HealthStatus {
  if (/\b(attention|urgent|critical)\b/iu.test(text)) return "attention";
  if (/\b(high|low|elevated|abnormal|monitor)\b/iu.test(text)) return "monitor";
  return "normal";
}

function resultDate(text: string, today: string): string {
  if (/\byesterday\b/iu.test(text)) return addDays(today, -1);
  const match = text.match(DATE_RE);
  if (!match) return today;
  const [value] = match;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value;
  const [month, day, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function defaultUnit(marker: string, value: string): string {
  const lower = marker.toLowerCase();
  if ((lower.includes("blood pressure") || lower === "bp") && value.includes("/")) return "mmHg";
  return "";
}

function resultOrgan(marker: string, fallback: string): string {
  const lower = marker.toLowerCase();
  if (lower.includes("blood pressure") || lower.includes("pulse") || lower.includes("heart rate")) return "heart";
  if (lower.includes("ldl") || lower.includes("hdl") || lower.includes("glucose") || lower.includes("a1c")) return "blood";
  return fallback || "blood";
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
