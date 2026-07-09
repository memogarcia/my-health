import test from "node:test";
import assert from "node:assert/strict";
import type { LabResult } from "../src/dashboard-model";
import { defaultLabSort, nextLabSort, sortLabResults } from "../src/components/history/history-helpers";

const baseLab: LabResult = {
  id: 1,
  reportId: null,
  reportSourceName: null,
  reportLocalCopyPath: null,
  organKey: "blood",
  marker: "LDL",
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

test("sortLabResults defaults to newest results first", () => {
  const sorted = sortLabResults([
    lab({ id: 1, measuredAt: "2026-07-01" }),
    lab({ id: 2, measuredAt: "2026-07-03" }),
  ]);
  assert.deepEqual(sorted.map((item) => item.id), [2, 1]);
});

test("sortLabResults sorts numeric result values from table headers", () => {
  const sorted = sortLabResults([
    lab({ id: 1, value: "110", valueNumber: 110 }),
    lab({ id: 2, value: "9", valueNumber: 9 }),
  ], { key: "value", direction: "asc" });
  assert.deepEqual(sorted.map((item) => item.id), [2, 1]);
});

test("nextLabSort toggles the active header and picks useful first directions", () => {
  assert.deepEqual(nextLabSort(defaultLabSort, "marker"), { key: "marker", direction: "asc" });
  assert.deepEqual(nextLabSort({ key: "marker", direction: "asc" }, "marker"), { key: "marker", direction: "desc" });
  assert.deepEqual(nextLabSort({ key: "marker", direction: "asc" }, "status"), { key: "status", direction: "desc" });
});
