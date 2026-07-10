import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyExtractedResult } from "../src/document-analysis";

test("createEmptyExtractedResult seeds an editable blank row", () => {
  const result = createEmptyExtractedResult("heart");
  assert.equal(result.organKey, "heart");
  assert.equal(result.marker, "");
  assert.equal(result.status, "");
  assert.match(result.measuredAt, /^\d{4}-\d{2}-\d{2}$/u);
  assert.ok(result.id);
});
