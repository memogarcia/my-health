import test from "node:test";
import assert from "node:assert/strict";
import { buildNumericLabSeries, numericValueOf, pickDefaultLabSeries } from "../src/charts/lab-series";
import type { LabResult } from "../src/dashboard-model";

function lab(overrides: Partial<LabResult>): LabResult {
  return {
    id: overrides.id ?? 1,
    organKey: overrides.organKey ?? "liver",
    marker: overrides.marker ?? "ALT",
    value: overrides.value ?? "20",
    valueNumber: overrides.valueNumber ?? null,
    unit: overrides.unit ?? "U/L",
    referenceRange: overrides.referenceRange ?? "7-56",
    referenceLow: overrides.referenceLow ?? 7,
    referenceHigh: overrides.referenceHigh ?? 56,
    flag: overrides.flag ?? "normal",
    status: overrides.status ?? "normal",
    measuredAt: overrides.measuredAt ?? "2024-01-01",
    notes: overrides.notes ?? "",
    reportId: overrides.reportId ?? null,
    reportSourceName: overrides.reportSourceName ?? null,
    reportLocalCopyPath: overrides.reportLocalCopyPath ?? null,
  };
}

test("numericValueOf prefers valueNumber and excludes non-numeric values", () => {
  assert.equal(numericValueOf(lab({ value: "text", valueNumber: 4.2 })), 4.2);
  const series = buildNumericLabSeries([lab({ value: "not numeric", valueNumber: null })]);
  assert.equal(series.length, 0);
  assert.equal(numericValueOf(lab({ value: "120/80", valueNumber: 120 })), null);
});

test("buildNumericLabSeries groups by marker, unit, and organ and sorts oldest first", () => {
  const series = buildNumericLabSeries([
    lab({ id: 2, value: "30", measuredAt: "2024-02-01" }),
    lab({ id: 1, value: "20", measuredAt: "2024-01-01" }),
    lab({ id: 3, unit: "IU/L", value: "40", measuredAt: "2024-03-01" }),
  ]);
  assert.equal(series.length, 2);
  assert.deepEqual(series[0].points.map((point) => point.id), [1, 2]);
  assert.equal(series[0].latest.id, 2);
  assert.equal(series[0].previous?.id, 1);
  assert.equal(series[0].hasMixedUnits, true);
});

test("pickDefaultLabSeries prioritizes attention, then history length", () => {
  const series = buildNumericLabSeries([
    lab({ id: 1, marker: "A", value: "1", status: "normal" }),
    lab({ id: 2, marker: "A", value: "2", status: "normal", measuredAt: "2024-02-01" }),
    lab({ id: 3, marker: "B", value: "3", status: "monitor" }),
    lab({ id: 4, marker: "C", value: "4", status: "attention" }),
  ]);
  assert.equal(pickDefaultLabSeries(series)?.marker, "C");
});

test("reference range changes are detected", () => {
  const series = buildNumericLabSeries([
    lab({ id: 1, referenceRange: "7-56", referenceLow: 7, referenceHigh: 56 }),
    lab({ id: 2, referenceRange: "10-50", referenceLow: 10, referenceHigh: 50, measuredAt: "2024-02-01" }),
  ]);
  assert.equal(series[0].hasReferenceChanges, true);
  assert.deepEqual(buildNumericLabSeries([]), []);
});
