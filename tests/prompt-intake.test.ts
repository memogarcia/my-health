import test from "node:test";
import assert from "node:assert/strict";
import { promptIntakeFromText } from "../src/prompt-intake";

const base = { today: "2026-07-09", organKey: "thyroid" };

test("promptIntakeFromText drafts a 30 day medication", () => {
  const action = promptIntakeFromText("I'm going to take Metformin 500 mg daily for the next 30 days", base);

  assert.equal(action.kind, "regimen");
  if (action.kind !== "regimen") return;
  assert.deepEqual(action.input, {
    kind: "medication",
    name: "Metformin",
    dose: "500",
    unit: "mg",
    frequency: "Daily",
    startDate: "2026-07-09",
    stopDate: "2026-08-08",
    reason: "",
    notes: "I'm going to take Metformin 500 mg daily for the next 30 days",
    active: false,
  });
});

test("promptIntakeFromText leaves indefinite medication active", () => {
  const action = promptIntakeFromText("start Vitamin D 2000 IU daily indefinitely", base);

  assert.equal(action.kind, "regimen");
  if (action.kind !== "regimen") return;
  assert.equal(action.input.name, "Vitamin D");
  assert.equal(action.input.stopDate, "");
  assert.equal(action.input.active, true);
});

test("promptIntakeFromText drafts lab results from short text", () => {
  const action = promptIntakeFromText("LDL 140 mg/dL today", base);

  assert.equal(action.kind, "result");
  if (action.kind !== "result") return;
  assert.equal(action.result.marker, "LDL");
  assert.equal(action.result.value, "140");
  assert.equal(action.result.unit, "mg/dL");
  assert.equal(action.result.organKey, "blood");
  assert.equal(action.result.measuredAt, "2026-07-09");
});

test("promptIntakeFromText drafts blood pressure with default unit", () => {
  const action = promptIntakeFromText("record blood pressure 120/80 yesterday", base);

  assert.equal(action.kind, "result");
  if (action.kind !== "result") return;
  assert.equal(action.result.marker, "Blood Pressure");
  assert.equal(action.result.value, "120/80");
  assert.equal(action.result.unit, "mmHg");
  assert.equal(action.result.organKey, "heart");
  assert.equal(action.result.measuredAt, "2026-07-08");
});

test("promptIntakeFromText keeps questions in chat", () => {
  assert.deepEqual(promptIntakeFromText("What does LDL mean?", base), { kind: "chat" });
  assert.deepEqual(promptIntakeFromText("Should I take Metformin 500 mg?", base), { kind: "chat" });
});
