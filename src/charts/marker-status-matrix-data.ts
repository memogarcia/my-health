import type { LabResult } from "../dashboard-model";
import { labSeriesKey } from "./lab-series";

export type MarkerStatusMatrixRow = {
  key: string;
  marker: string;
  organKey: string;
  seriesKey: string;
  labsByDate: Map<string, LabResult>;
};

export type MarkerStatusMatrixData = {
  dates: string[];
  rows: MarkerStatusMatrixRow[];
};

export function buildMarkerStatusMatrixData(labs: LabResult[]): MarkerStatusMatrixData {
  const dates = [...new Set(labs.map((lab) => lab.measuredAt))].sort().slice(-8);
  const grouped = new Map<string, { latest: LabResult; labsByDate: Map<string, LabResult> }>();

  for (const lab of labs) {
    const markerKey = lab.marker.trim().toLowerCase();
    if (!markerKey) continue;
    const key = `${lab.organKey}|${markerKey}`;
    const current = grouped.get(key);
    const latest = !current || isLater(lab, current.latest) ? lab : current.latest;
    const labsByDate = current?.labsByDate || new Map<string, LabResult>();
    const sameDay = labsByDate.get(lab.measuredAt);
    if (!sameDay || lab.id > sameDay.id) labsByDate.set(lab.measuredAt, lab);
    grouped.set(key, { latest, labsByDate });
  }

  const rows = [...grouped.entries()]
    .map(([key, { latest, labsByDate }]) => ({
      key,
      marker: latest.marker.trim(),
      organKey: latest.organKey,
      seriesKey: labSeriesKey(latest),
      labsByDate,
    }))
    .sort((a, b) => a.marker.localeCompare(b.marker) || a.organKey.localeCompare(b.organKey))
    .slice(0, 12);

  return { dates, rows };
}

function isLater(candidate: LabResult, current: LabResult): boolean {
  return candidate.measuredAt > current.measuredAt
    || (candidate.measuredAt === current.measuredAt && candidate.id > current.id);
}
