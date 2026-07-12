import test from "node:test";
import assert from "node:assert/strict";
import { appendResearchInstruction, appendResearchPlan } from "../src/ai-actions";
import { buildDeepResearchBrief, buildDeepResearchPrompt } from "../src/deep-research";
import { normalizeUserState, type DisplaySnapshot } from "../src/dashboard-model";

const display: DisplaySnapshot = {
  dbPath: "synthetic.sqlite3",
  organs: [{ key: "heart", name: "Heart", system: "Cardiovascular", status: "attention", labCount: 2, symptomCount: 1 }],
  latestLabResults: [
    { id: 1, reportId: null, reportSourceName: null, reportLocalCopyPath: null, organKey: "heart", marker: "LDL", value: "170", valueNumber: 170, unit: "mg/dL", status: "attention", flag: "high", measuredAt: "2026-06-01", notes: "synthetic", referenceRange: "", referenceLow: null, referenceHigh: null },
    { id: 2, reportId: null, reportSourceName: null, reportLocalCopyPath: null, organKey: "heart", marker: " ldl ", value: "130", valueNumber: 130, unit: "mg/dL", status: "monitor", flag: "high", measuredAt: "2026-07-01", notes: "synthetic", referenceRange: "", referenceLow: null, referenceHigh: null },
  ],
  recentSymptoms: [{ id: 1, organKey: "heart", name: "Synthetic symptom", severity: 2, observedAt: "2026-07-10", notes: "" }],
  conditions: [],
  regimenItems: [],
  aiRecommendations: [],
  labReports: [{ id: 1, sourceName: "report.pdf", fileType: "PDF", sizeLabel: "1 KB", localCopyPath: "", resultCount: 2, createdAt: "2026-07-01", updatedAt: "2026-07-01" }],
};

test("deep research prompt is detailed without duplicating the health payload", () => {
  const prompt = buildDeepResearchPrompt("What changed?", "comprehensive");

  assert.match(prompt, /Research question: What changed\?/u);
  assert.match(prompt, /every relevant dated record/u);
  assert.match(prompt, /Do not invent citations/u);
  assert.equal(prompt.includes("synthetic.sqlite3"), false);
  assert.equal(prompt.includes("{\n"), false);
});

test("deep research pass prompts stay bounded and carry the evidence map forward", () => {
  const base = "context";
  const first = appendResearchInstruction(base, "build evidence map");
  const second = appendResearchPlan(base, "dated evidence");

  assert.match(first, /pass|evidence map/iu);
  assert.match(second, /dated evidence/u);
  assert.ok(first.length <= 240_000);
  assert.ok(second.length <= 240_000);
  assert.equal(appendResearchPlan("x".repeat(240_000), "ignored").length, 240_000);
});

test("deep research brief counts every dated result and supported context source", () => {
  const state = normalizeUserState({
    dietEntries: [{ id: "meal-1", loggedAt: "2026-07-10", meal: "lunch", title: "Synthetic lunch", notes: "" }],
    activityEntries: [{ id: "log-1", loggedAt: "2026-07-10", cigarettes: 0, drinks: 0, activityName: "Walk", durationMinutes: 20, notes: "" }],
  });
  const brief = buildDeepResearchBrief(display, state);

  assert.equal(brief.coverage.find((item) => item.key === "markers")?.count, 2);
  assert.equal(brief.coverage.find((item) => item.key === "diet")?.count, 1);
  assert.equal(brief.coverage.find((item) => item.key === "documents")?.count, 1);
});
