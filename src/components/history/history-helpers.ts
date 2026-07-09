import type { LabResult, OrganSummary, SymptomEntry } from "../../dashboard-model";

export type OrganFilter = string;
export type LabView = "grouped" | "list";
export type LabSortKey = "measuredAt" | "marker" | "value" | "unit" | "referenceRange" | "status" | "notes";
export type LabSortDirection = "asc" | "desc";
export type LabSort = { key: LabSortKey; direction: LabSortDirection };

export type OrganOption = { key: string; name: string; count: number };

export const defaultLabSort: LabSort = { key: "measuredAt", direction: "desc" };

const statusSort: Record<LabResult["status"], number> = {
  normal: 0,
  monitor: 1,
  attention: 2,
};

export function nextLabSort(current: LabSort, key: LabSortKey): LabSort {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: key === "measuredAt" || key === "status" ? "desc" : "asc" };
}

export function sortLabResults(labs: LabResult[], sort: LabSort = defaultLabSort): LabResult[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...labs].sort((left, right) => {
    const result = compareLabValue(left, right, sort.key);
    return result * direction || right.measuredAt.localeCompare(left.measuredAt) || right.id - left.id;
  });
}

function compareLabValue(left: LabResult, right: LabResult, key: LabSortKey): number {
  const leftValue = labSortValue(left, key);
  const rightValue = labSortValue(right, key);
  if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue;
  return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
}

function labSortValue(lab: LabResult, key: LabSortKey): string | number {
  switch (key) {
    case "measuredAt":
      return lab.measuredAt;
    case "marker":
      return lab.marker;
    case "value":
      return lab.valueNumber ?? lab.value;
    case "unit":
      return lab.unit;
    case "referenceRange":
      return lab.referenceRange;
    case "status":
      return statusSort[lab.status];
    case "notes":
      return lab.notes;
  }
}

export function filterLabs(labs: LabResult[], organFilter: OrganFilter, search: string): LabResult[] {
  const query = search.trim().toLowerCase();
  return labs.filter((lab) => {
    if (organFilter !== "all" && lab.organKey !== organFilter) return false;
    if (query && !lab.marker.toLowerCase().includes(query) && !(lab.notes || "").toLowerCase().includes(query)) return false;
    return true;
  });
}

export function filterSymptoms(symptoms: SymptomEntry[], organFilter: OrganFilter, search: string): SymptomEntry[] {
  const query = search.trim().toLowerCase();
  return symptoms.filter((symptom) => {
    if (organFilter !== "all" && symptom.organKey !== organFilter) return false;
    if (query && !symptom.name.toLowerCase().includes(query) && !(symptom.notes || "").toLowerCase().includes(query)) return false;
    return true;
  });
}

export function organOptions(data: Array<{ organKey: string }>, organs: OrganSummary[]): OrganOption[] {
  const counts = new Map<string, number>();
  for (const entry of data) counts.set(entry.organKey, (counts.get(entry.organKey) || 0) + 1);
  return organs
    .filter((organ) => counts.has(organ.key))
    .map((organ) => ({ key: organ.key, name: organ.name, count: counts.get(organ.key) as number }));
}

export function organName(key: string, organs: OrganSummary[]): string {
  return organs.find((organ) => organ.key === key)?.name || key;
}

export function severityRank(symptom: SymptomEntry): number {
  return symptom.severity;
}

export function formatDelta(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
