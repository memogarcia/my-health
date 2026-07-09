import test from "node:test";
import assert from "node:assert/strict";
import { linearScale, padDomain } from "../src/charts/chart-scale";
import { buildWeeklySymptomSeries } from "../src/charts/symptom-series";
import type { SymptomEntry } from "../src/dashboard-model";

function symptom(id: number, observedAt: string, severity: number): SymptomEntry {
  return { id, organKey: "brain", name: "Headache", severity, observedAt, notes: "" };
}

test("linearScale maps domain to range", () => {
  const scale = linearScale([0, 10], [0, 100]);
  assert.equal(scale(5), 50);
  assert.deepEqual(padDomain([10, 10]), [8.8, 11.2]);
});

test("buildWeeklySymptomSeries groups symptoms by week", () => {
  const points = buildWeeklySymptomSeries([
    symptom(1, "2024-01-01", 2),
    symptom(2, "2024-01-03", 5),
    symptom(3, "2024-01-10", 1),
  ]);
  assert.equal(points.length, 2);
  assert.deepEqual(points[0], { week: "2024-01-01", count: 2, maxSeverity: 5, averageSeverity: 3.5 });
});
