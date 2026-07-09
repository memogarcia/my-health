import { todayString } from "./dashboard-format";
import { type AppleHealthImport } from "./dashboard-model";
import { t } from "./i18n";

export const MAX_APPLE_HEALTH_XML_BYTES = 5 * 1024 * 1024;

export function validateAppleHealthFile(file: File): void {
  if (!file.name.toLowerCase().endsWith(".xml")) {
    throw new Error(t("appleHealth.chooseExport"));
  }
  if (file.size > MAX_APPLE_HEALTH_XML_BYTES) {
    throw new Error(t("appleHealth.tooLarge"));
  }
}

export function summarizeAppleHealthXml(text: string, sourceName: string): AppleHealthImport {
  const dates: string[] = [];
  let recordCount = 0;
  let workoutCount = 0;
  for (const match of text.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(Record|Workout)\b[^>]*>/g)) {
    if (match[1] === "Record") recordCount += 1;
    else workoutCount += 1;
    const date = /\bstartDate=(["'])(.*?)\1/.exec(match[0])?.[2]?.slice(0, 10);
    if (date) dates.push(date);
  }
  if (recordCount === 0 && workoutCount === 0) {
    throw new Error(t("appleHealth.noRecords"));
  }
  dates.sort();
  return {
    id: makeId(),
    sourceName,
    importedAt: todayString(),
    recordCount,
    workoutCount,
    startedAt: dates[0] || "",
    endedAt: dates.at(-1) || "",
  };
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
