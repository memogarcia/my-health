import test from "node:test";
import assert from "node:assert/strict";
import { biologicalAgeInputFromForm, formatAge } from "../src/genetics-model";

test("biologicalAgeInputFromForm keeps only entered system scores", () => {
  const form = new FormData();
  form.set("reportName", "Synthetic report");
  form.set("provider", "Example lab");
  form.set("collectedAt", "2026-07-10");
  form.set("chronologicalAge", "34");
  form.set("overallAge", "38");
  form.set("percentile", "82.2");
  form.set("system-lungs", "36");
  form.set("system-brain", "38");

  assert.deepEqual(biologicalAgeInputFromForm(form), {
    reportName: "Synthetic report",
    provider: "Example lab",
    collectedAt: "2026-07-10",
    chronologicalAge: 34,
    overallAge: 38,
    percentile: 82.2,
    notes: "",
    systemScores: [
      { systemKey: "lungs", age: 36 },
      { systemKey: "brain", age: 38 },
    ],
  });
});

test("biologicalAgeInputFromForm requires at least one system score", () => {
  const form = new FormData();
  form.set("reportName", "Synthetic report");
  form.set("collectedAt", "2026-07-10");
  form.set("chronologicalAge", "34");
  form.set("overallAge", "38");

  assert.throws(() => biologicalAgeInputFromForm(form), /system age/i);
});

test("formatAge preserves useful decimal precision", () => {
  assert.equal(formatAge(38), "38");
  assert.equal(formatAge(38.25), "38.3");
});
