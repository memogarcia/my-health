import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDisplaySnapshot,
  deriveOrganStatus,
  isCurrentSymptom,
  latestLabsByMarker,
  normalizeUserState,
  type ConditionEntry,
  type DashboardSnapshot,
  type LabResult,
  type SymptomEntry,
} from "../src/dashboard-model";

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

function symptom(patch: Partial<SymptomEntry> = {}): SymptomEntry {
  return {
    id: 1,
    organKey: "heart",
    name: "Synthetic symptom",
    severity: 1,
    observedAt: "2026-07-10",
    notes: "",
    ...patch,
  };
}

function condition(patch: Partial<ConditionEntry> = {}): ConditionEntry {
  return {
    id: 1,
    organKey: "heart",
    name: "Synthetic condition",
    status: "past",
    diagnosedAt: "",
    notes: "",
    ...patch,
  };
}

test("latestLabsByMarker keeps only the newest normalized marker row", () => {
  const latest = latestLabsByMarker([
    lab({ id: 1, marker: "LDL", measuredAt: "2026-06-01", status: "attention" }),
    lab({ id: 2, marker: " ldl ", measuredAt: "2026-07-01", status: "monitor" }),
    lab({ id: 3, marker: "LDL", measuredAt: "2026-07-01", status: "normal" }),
    lab({ id: 4, marker: "HDL", measuredAt: "2026-05-01" }),
  ]);

  assert.deepEqual(latest.map((item) => item.id).sort(), [3, 4]);
});

test("latestLabsByMarker treats a unit change as one current marker", () => {
  const latest = latestLabsByMarker([
    lab({ id: 1, unit: "mg/dL", measuredAt: "2026-06-01", status: "attention" }),
    lab({ id: 2, unit: "mmol/L", measuredAt: "2026-07-01", status: "normal" }),
  ]);

  assert.equal(latest.length, 1);
  assert.equal(latest[0].id, 2);
  assert.equal(latest[0].status, "normal");
});

test("deriveOrganStatus ignores superseded lab priorities", () => {
  const status = deriveOrganStatus({
    labs: [
      lab({ id: 1, measuredAt: "2026-06-01", status: "attention" }),
      lab({ id: 2, measuredAt: "2026-07-01", status: "normal" }),
    ],
    symptoms: [],
    conditions: [],
  }, "2026-07-10");

  assert.equal(status, "normal");
});

test("current symptom window includes the 30-day boundary and excludes older or future entries", () => {
  assert.equal(isCurrentSymptom(symptom({ observedAt: "2026-06-10" }), "2026-07-10"), true);
  assert.equal(isCurrentSymptom(symptom({ observedAt: "2026-06-09" }), "2026-07-10"), false);
  assert.equal(isCurrentSymptom(symptom({ observedAt: "2026-07-11" }), "2026-07-10"), false);

  assert.equal(deriveOrganStatus({
    labs: [],
    symptoms: [
      symptom({ id: 1, severity: 5, observedAt: "2026-06-09" }),
      symptom({ id: 2, severity: 5, observedAt: "2026-07-11" }),
    ],
    conditions: [],
  }, "2026-07-10"), "normal");
  assert.equal(deriveOrganStatus({
    labs: [],
    symptoms: [symptom({ severity: 4, observedAt: "2026-06-10" })],
    conditions: [],
  }, "2026-07-10"), "attention");
});

test("only current conditions contribute to current organ state", () => {
  assert.equal(deriveOrganStatus({ labs: [], symptoms: [], conditions: [condition({ status: "past" })] }, "2026-07-10"), "normal");
  assert.equal(deriveOrganStatus({ labs: [], symptoms: [], conditions: [condition({ status: "managed" })] }, "2026-07-10"), "normal");
  assert.equal(deriveOrganStatus({ labs: [], symptoms: [], conditions: [condition({ status: "current" })] }, "2026-07-10"), "monitor");
});

test("buildDisplaySnapshot replaces a stale backend status with the current model", () => {
  const snapshot: DashboardSnapshot = {
    dbPath: "/tmp/synthetic.sqlite3",
    organs: [{ key: "heart", name: "Heart", system: "Cardiovascular", status: "attention", labCount: 10, symptomCount: 4 }],
    latestLabResults: [],
    recentSymptoms: [],
    conditions: [],
    regimenItems: [],
    aiRecommendations: [],
    labReports: [],
  };

  assert.equal(buildDisplaySnapshot(snapshot).organs[0].status, "normal");
});

test("normalizeUserState restores a bounded local fasting timer and history", () => {
  const state = normalizeUserState({
    fasting: {
      activeStartedAt: "2026-07-10T00:00:00.000Z",
      targetHours: 99,
      sessions: [{ id: "fast-1", startedAt: "2026-07-09T00:00:00.000Z", endedAt: "2026-07-09T16:00:00.000Z", targetHours: 4 }],
    },
  });

  assert.equal(state.fasting.activeStartedAt, "2026-07-10T00:00:00.000Z");
  assert.equal(state.fasting.targetHours, 24);
  assert.equal(state.fasting.sessions[0].targetHours, 12);
});
