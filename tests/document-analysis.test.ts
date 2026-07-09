import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyExtractedResult, parseExtractedResults } from "../src/document-analysis";

test("parseExtractedResults reads a clean JSON array", () => {
  const raw = JSON.stringify([
    {
      organKey: "blood",
      marker: "Glucose",
      value: "105",
      unit: "mg/dL",
      referenceRange: "70-99",
      status: "monitor",
      measuredAt: "2026-07-01",
      notes: "Fasting",
    },
  ]);
  const [result] = parseExtractedResults(raw);
  assert.equal(result.marker, "Glucose");
  assert.equal(result.organKey, "blood");
  assert.equal(result.status, "monitor");
  assert.equal(result.measuredAt, "2026-07-01");
  assert.ok(result.id);
});

test("parseExtractedResults strips markdown fences and surrounding prose", () => {
  const raw = `Here are the results:\n\`\`\`json\n[{"marker":"HDL","value":"55","unit":"mg/dL","status":"normal","measuredAt":"2026-07-01"}]\n\`\`\`\nLet me know.`;
  const results = parseExtractedResults(raw);
  assert.equal(results.length, 1);
  assert.equal(results[0].marker, "HDL");
});

test("parseExtractedResults blanks uncertain dates and statuses", () => {
  const raw = `[{"marker":"LDL","value":"160","measuredAt":"07/04/2026","organKey":"plasma"},{"marker":"TSH","value":"2.1","measuredAt":"not sure","status":"fine"}]`;
  const [first, second] = parseExtractedResults(raw);
  assert.equal(first.organKey, "blood");
  assert.equal(first.measuredAt, "2026-07-04");
  assert.equal(first.status, "");
  assert.equal(second.measuredAt, "");
  assert.equal(second.status, "");
});

test("parseExtractedResults ignores entries without a marker and caps the count", () => {
  const raw = JSON.stringify([
    { value: "100", measuredAt: "2026-07-01" },
    { marker: "WBC", value: "6.0", measuredAt: "2026-07-01" },
  ]);
  const results = parseExtractedResults(raw);
  assert.equal(results.length, 1);
  assert.equal(results[0].marker, "WBC");
});

test("parseExtractedResults returns empty when no JSON array is present", () => {
  assert.deepEqual(parseExtractedResults("I could not read the file."), []);
  assert.deepEqual(parseExtractedResults(""), []);
});

test("createEmptyExtractedResult seeds an editable blank row", () => {
  const result = createEmptyExtractedResult("heart");
  assert.equal(result.organKey, "heart");
  assert.equal(result.marker, "");
  assert.equal(result.status, "normal");
  assert.match(result.measuredAt, /^\d{4}-\d{2}-\d{2}$/u);
  assert.ok(result.id);
});
