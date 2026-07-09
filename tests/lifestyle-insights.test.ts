import test from "node:test";
import assert from "node:assert/strict";
import { buildDeepResearchPrompt, buildLifestylePlan } from "../src/lifestyle-insights";
import type { DisplaySnapshot, UserState } from "../src/dashboard-model";

const display: DisplaySnapshot = {
  dbPath: "synthetic.sqlite3",
  organs: [{ key: "heart", name: "Heart", system: "Cardiovascular", status: "attention", labCount: 1, symptomCount: 1 }],
  latestLabResults: [{
    id: 1,
    reportId: null,
    reportSourceName: null,
    reportLocalCopyPath: null,
    organKey: "heart",
    marker: "LDL cholesterol",
    value: "160",
    valueNumber: 160,
    unit: "mg/dL",
    status: "attention",
    flag: "high",
    measuredAt: "2026-07-01",
    notes: "synthetic sample",
    referenceRange: "",
    referenceLow: null,
    referenceHigh: null,
  }],
  recentSymptoms: [{ id: 1, organKey: "heart", name: "Chest tightness", severity: 4, observedAt: "2026-07-02", notes: "synthetic sample" }],
  conditions: [{ id: 1, organKey: "heart", name: "Hypertension", status: "managed", diagnosedAt: "2025-01-01", notes: "" }],
  regimenItems: [{
    id: 1,
    kind: "medication",
    name: "Example medication",
    dose: "10",
    unit: "mg",
    frequency: "Daily",
    startDate: "2026-01-01",
    stopDate: "",
    reason: "synthetic",
    notes: "",
    active: true,
  }],
  aiRecommendations: [],
};

const userState: UserState = {
  profile: { age: 40, sex: "not specified", heightCm: 170, weightKg: 70 },
  activityEntries: [{ id: "a1", loggedAt: "2026-07-03", cigarettes: 0, drinks: 1, activityName: "Walk", durationMinutes: 20, notes: "synthetic sample" }],
  appleHealthImports: [{ id: "h1", sourceName: "Apple Health", importedAt: "2026-07-04", recordCount: 10, workoutCount: 2, startedAt: "2026-07-01", endedAt: "2026-07-04" }],
  aiConversations: [],
  activeAiConversationId: "",
};

test("buildLifestylePlan turns saved health data into actionable categories", () => {
  const plan = buildLifestylePlan(display, userState);

  assert.deepEqual(plan.recommendations.map((item) => item.category), ["Breathing", "Exercise", "Activity", "Routine"]);
  assert.ok(plan.signals.some((signal) => signal.includes("marker")));
  assert.match(plan.prompt, /LDL cholesterol/u);
  assert.match(plan.prompt, /Age: 40/u);
  assert.match(plan.prompt, /Hypertension/u);
  assert.match(plan.prompt, /Example medication/u);
  assert.match(plan.prompt, /Apple Health/u);
});

test("buildDeepResearchPrompt includes all saved data sections", () => {
  const prompt = buildDeepResearchPrompt(display, userState);

  assert.match(prompt, /LDL cholesterol/u);
  assert.match(prompt, /Chest tightness/u);
  assert.match(prompt, /Hypertension/u);
  assert.match(prompt, /Example medication/u);
  assert.match(prompt, /Apple Health/u);
});
