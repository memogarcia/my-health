import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyExtractedResult, parseExtractedResults } from "../src/document-analysis";

test("parseExtractedResults reads structured Codex output", () => {
  const [result] = parseExtractedResults(JSON.stringify({
    results: [{
      organKey: "blood",
      marker: "Glucose",
      value: "105",
      unit: "mg/dL",
      referenceRange: "70-99",
      status: "monitor",
      measuredAt: "2026-07-01",
      notes: "Fasting",
    }],
  }));
  assert.equal(result.marker, "Glucose");
  assert.equal(result.status, "monitor");
  assert.equal(result.measuredAt, "2026-07-01");
});

test("parseExtractedResults keeps uncertain fields reviewable", () => {
  const [result] = parseExtractedResults('```json\n[{"marker":"LDL","value":"160","organKey":"unknown","status":"unclear"}]\n```', "heart");
  assert.equal(result.organKey, "heart");
  assert.equal(result.status, "");
  assert.equal(result.measuredAt, "");
});

test("parseExtractedResults rejects non-JSON output and rows without markers", () => {
  assert.deepEqual(parseExtractedResults("No measurements found."), []);
  assert.deepEqual(parseExtractedResults('{"results":[{"value":"1"}]}'), []);
});

test("createEmptyExtractedResult seeds an editable blank row", () => {
  const result = createEmptyExtractedResult("heart");
  assert.equal(result.organKey, "heart");
  assert.equal(result.marker, "");
  assert.equal(result.status, "");
  assert.match(result.measuredAt, /^\d{4}-\d{2}-\d{2}$/u);
  assert.ok(result.id);
});
