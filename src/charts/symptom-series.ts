import type { SymptomEntry } from "../dashboard-model";

export type WeeklySymptomPoint = { week: string; count: number; maxSeverity: number; averageSeverity: number };

export function buildWeeklySymptomSeries(symptoms: SymptomEntry[]): WeeklySymptomPoint[] {
  const groups = new Map<string, SymptomEntry[]>();
  for (const symptom of symptoms) {
    const week = weekStart(symptom.observedAt);
    if (!week) continue;
    groups.set(week, [...(groups.get(week) || []), symptom]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, entries]) => {
    const severities = entries.map((entry) => entry.severity);
    return {
      week,
      count: entries.length,
      maxSeverity: Math.max(...severities),
      averageSeverity: severities.reduce((sum, value) => sum + value, 0) / severities.length,
    };
  });
}

function weekStart(value: string): string | null {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getDay();
  const mondayOffset = (day + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
