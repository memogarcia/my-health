import type { HealthStatus, LabResult } from "../dashboard-model";
import { parseLabNumber } from "../sparkline";

export type NumericLabPoint = LabResult & { numericValue: number };
export type NumericLabSeries = {
  key: string;
  marker: string;
  unit: string;
  organKey: string;
  status: HealthStatus;
  points: NumericLabPoint[];
  latest: NumericLabPoint;
  previous: NumericLabPoint | null;
  hasMixedUnits: boolean;
  hasReferenceChanges: boolean;
};

const statusRank: Record<HealthStatus, number> = { normal: 0, monitor: 1, attention: 2 };

export function numericValueOf(lab: LabResult): number | null {
  if (lab.value.includes("/")) return null;
  return lab.valueNumber ?? parseLabNumber(lab.value);
}

export function labSeriesKey(lab: Pick<LabResult, "marker" | "unit" | "organKey">): string {
  return [lab.marker.trim().toLowerCase(), lab.unit.trim().toLowerCase(), lab.organKey].join("|");
}

export function buildNumericLabSeries(labs: LabResult[]): NumericLabSeries[] {
  const groups = new Map<string, NumericLabPoint[]>();
  const markerUnits = new Map<string, Set<string>>();
  for (const lab of labs) {
    const numericValue = numericValueOf(lab);
    if (numericValue == null) continue;
    const markerKey = lab.marker.trim().toLowerCase();
    const unitKey = lab.unit.trim().toLowerCase();
    const key = labSeriesKey(lab);
    markerUnits.set(markerKey, (markerUnits.get(markerKey) || new Set()).add(unitKey));
    groups.set(key, [...(groups.get(key) || []), { ...lab, numericValue }]);
  }
  return [...groups.entries()].map(([key, points]) => {
    const sorted = points.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id - b.id);
    const latest = sorted[sorted.length - 1];
    const markerKey = latest.marker.trim().toLowerCase();
    const references = new Set(sorted.map((point) => `${point.referenceLow ?? ""}:${point.referenceHigh ?? ""}:${point.referenceRange}`));
    return {
      key,
      marker: latest.marker,
      unit: latest.unit,
      organKey: latest.organKey,
      status: latest.status,
      points: sorted,
      latest,
      previous: sorted.at(-2) || null,
      hasMixedUnits: (markerUnits.get(markerKey)?.size || 0) > 1,
      hasReferenceChanges: references.size > 1,
    };
  }).sort(compareSeries);
}

export function pickDefaultLabSeries(series: NumericLabSeries[]): NumericLabSeries | null {
  return [...series].sort(compareSeries)[0] || null;
}

function compareSeries(a: NumericLabSeries, b: NumericLabSeries): number {
  return statusRank[b.status] - statusRank[a.status]
    || b.points.length - a.points.length
    || b.latest.measuredAt.localeCompare(a.latest.measuredAt)
    || a.marker.localeCompare(b.marker);
}
