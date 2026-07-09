import test from "node:test";
import assert from "node:assert/strict";
import type { LabResult } from "../src/dashboard-model";
import { groupByMarker } from "../src/sparkline";

const baseLab: LabResult = {
  id: 1,
  reportId: null,
  reportSourceName: null,
  reportLocalCopyPath: null,
  organKey: "blood",
  marker: "Glucose",
  value: "100",
  valueNumber: 100,
  unit: "mg/dL",
  status: "normal",
  flag: "normal",
  measuredAt: "2026-07-01",
  notes: "",
  referenceRange: "",
  referenceLow: null,
  referenceHigh: null,
};

function lab(patch: Partial<LabResult>): LabResult {
  return { ...baseLab, ...patch };
}

test("groupByMarker keeps different units and organs separate", () => {
  const series = groupByMarker([
    lab({ id: 1, marker: "Glucose", unit: "mg/dL", organKey: "blood" }),
    lab({ id: 2, marker: "Glucose", unit: "mmol/L", organKey: "blood" }),
    lab({ id: 3, marker: "Glucose", unit: "mg/dL", organKey: "pancreas" }),
    lab({ id: 4, marker: "Glucose", unit: "mg/dL", organKey: "blood", measuredAt: "2026-07-02" }),
  ]);

  assert.equal(series.length, 3);
  assert.deepEqual(series.map((item) => item.points.length).sort(), [1, 1, 2]);
  assert.equal(series.find((item) => item.organKey === "blood" && item.unit === "mg/dL")?.points.length, 2);
});
