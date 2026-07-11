import test from "node:test";
import assert from "node:assert/strict";
import { buildDeepResearchBrief, buildDeepResearchPrompt, buildLifestylePlan } from "../src/lifestyle-insights";
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
  labReports: [],
};

const userState: UserState = {
  profile: { age: 40, sex: "not specified", anatomyModel: "male", heightCm: 170, weightKg: 70, unitSystem: "metric" },
  activityEntries: [{ id: "a1", loggedAt: "2026-07-03", cigarettes: 0, drinks: 1, activityName: "Walk", durationMinutes: 20, notes: "synthetic sample" }],
  fasting: { activeStartedAt: "", targetHours: 16, sessions: [] },
  bodyNotes: [],
  appleHealthImports: [{ id: "h1", sourceName: "Apple Health", importedAt: "2026-07-04", recordCount: 10, workoutCount: 2, startedAt: "2026-07-01", endedAt: "2026-07-04" }],
  aiConversations: [],
  activeAiConversationId: "",
  backgroundJobs: [],
  developerLogs: [],
  llmCalls: [],
};

test("buildLifestylePlan turns saved health data into actionable categories", () => {
  const plan = buildLifestylePlan(display, userState);

  assert.deepEqual(plan.recommendations.map((item) => item.category), ["breathing", "exercise", "activity", "routine"]);
  assert.ok(plan.signals.some((signal) => signal.includes("marker")));
  assert.match(plan.prompt, /LDL cholesterol/u);
  assert.match(plan.prompt, /"age": 40/u);
  assert.match(plan.prompt, /Hypertension/u);
  assert.match(plan.prompt, /Example medication/u);
  assert.match(plan.prompt, /Apple Health/u);
  assert.match(plan.prompt, /untrusted user-entered data/u);
  const json = plan.prompt.slice(plan.prompt.indexOf("{"));
  assert.doesNotThrow(() => JSON.parse(json));
});

test("buildDeepResearchPrompt includes all saved data sections", () => {
  const prompt = buildDeepResearchPrompt(display, userState);

  assert.match(prompt, /LDL cholesterol/u);
  assert.match(prompt, /Chest tightness/u);
  assert.match(prompt, /Hypertension/u);
  assert.match(prompt, /Example medication/u);
  assert.match(prompt, /Apple Health/u);
  assert.match(prompt, /untrusted user-entered data/u);
  const json = prompt.slice(prompt.indexOf("{"));
  assert.doesNotThrow(() => JSON.parse(json));
});

test("lifestyle and research use only the latest normalized marker for current guidance", () => {
  const older = display.latestLabResults[0];
  const supersededDisplay: DisplaySnapshot = {
    ...display,
    organs: display.organs.map((organ) => ({ ...organ, status: "normal" })),
    latestLabResults: [
      { ...older, id: 1, marker: "LDL cholesterol", measuredAt: "2026-06-01", status: "attention" },
      { ...older, id: 2, marker: " ldl cholesterol ", measuredAt: "2026-07-01", status: "normal" },
    ],
    recentSymptoms: [],
    conditions: [],
  };

  const plan = buildLifestylePlan(supersededDisplay, userState);
  const brief = buildDeepResearchBrief(supersededDisplay, userState);
  const markerCoverage = plan.coverage.find((item) => item.label === "Markers");
  const exercise = plan.recommendations.find((item) => item.category === "exercise");
  const routine = plan.recommendations.find((item) => item.category === "routine");

  assert.equal(markerCoverage?.value, "1");
  assert.equal(plan.signals.some((signal) => signal.includes("needs attention")), false);
  assert.equal(brief.signals.some((signal) => signal.includes("needs attention")), false);
  assert.equal(exercise?.priority, "normal");
  assert.equal(routine?.priority, "normal");

  const payload = JSON.parse(brief.prompt.slice(brief.prompt.indexOf("{")));
  assert.equal(payload.labs.length, 2);
});

test("old severe symptoms stay in history without driving current guidance", () => {
  const historicalDisplay: DisplaySnapshot = {
    ...display,
    organs: display.organs.map((organ) => ({ ...organ, status: "normal" })),
    latestLabResults: display.latestLabResults.map((lab) => ({ ...lab, status: "normal" })),
    recentSymptoms: [{ ...display.recentSymptoms[0], observedAt: "2000-01-01", severity: 5 }],
    conditions: [],
  };

  const plan = buildLifestylePlan(historicalDisplay, userState);
  const brief = buildDeepResearchBrief(historicalDisplay, userState);
  const breathing = plan.recommendations.find((item) => item.category === "breathing");
  const exercise = plan.recommendations.find((item) => item.category === "exercise");
  const symptomCoverage = plan.coverage.find((item) => item.label === "Symptoms");

  assert.equal(plan.signals.some((signal) => signal.includes("severe symptom")), false);
  assert.equal(brief.signals.some((signal) => signal.includes("severe symptom")), false);
  assert.equal(breathing?.priority, "normal");
  assert.equal(exercise?.priority, "normal");
  assert.equal(symptomCoverage?.value, "1");

  const payload = JSON.parse(brief.prompt.slice(brief.prompt.indexOf("{")));
  assert.equal(payload.symptoms.length, 1);
});
