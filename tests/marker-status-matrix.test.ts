import test from "node:test";
import assert from "node:assert/strict";
import { buildMarkerStatusMatrixData } from "../src/charts/marker-status-matrix-data";
import type { LabResult } from "../src/dashboard-model";

function lab(patch: Partial<LabResult> = {}): LabResult {
  return {
    id: 1,
    reportId: null,
    reportSourceName: null,
    reportLocalCopyPath: null,
    organKey: "heart",
    marker: "LDL",
    value: "100",
    valueNumber: 100,
    unit: "mg/dL",
    status: "normal",
    flag: "normal",
    measuredAt: "2026-07-01",
    notes: "",
    referenceRange: "70-120",
    referenceLow: 70,
    referenceHigh: 120,
    ...patch,
  };
}

test("marker matrix normalizes marker identity and keeps the latest same-day row", () => {
  const data = buildMarkerStatusMatrixData([
    lab({ id: 5, marker: " ldl ", unit: "mg/dL", value: "105" }),
    lab({ id: 2, marker: "LDL", unit: "mmol/L", value: "102" }),
    lab({ id: 8, marker: "Ldl", measuredAt: "2026-06-01", unit: "mmol/L", value: "98" }),
    lab({ id: 9, marker: "HDL", value: "55" }),
    lab({ id: 10, organKey: "liver", marker: "LDL", value: "110" }),
  ]);

  assert.deepEqual(data.dates, ["2026-06-01", "2026-07-01"]);
  assert.deepEqual(data.rows.map((row) => row.key), ["heart|hdl", "heart|ldl", "liver|ldl"]);
  const ldl = data.rows.find((row) => row.key === "heart|ldl");
  assert.equal(ldl?.marker, "ldl");
  assert.equal(ldl?.seriesKey, "ldl|mg/dl|heart");
  assert.equal(ldl?.labsByDate.get("2026-06-01")?.id, 8);
  assert.equal(ldl?.labsByDate.get("2026-07-01")?.id, 5);
});
