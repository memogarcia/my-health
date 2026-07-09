import { t } from "./i18n";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] || char;
  });
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const shortDateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export function formatDate(value: string): string {
  if (!value) {
    return t("dashboard.noDate");
  }
  const dateParts = isoDateParts(value);
  if (!dateParts) {
    return t("dashboard.invalidDate");
  }
  const [year, month, day] = dateParts;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? t("dashboard.invalidDate") : shortDateFormat.format(date);
}

function isoDateParts(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/u.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return [year, month, day];
}
