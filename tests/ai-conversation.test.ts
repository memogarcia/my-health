import test from "node:test";
import assert from "node:assert/strict";
import { buildAiConversationPrompt, getActiveAiConversation, mergeAiConversationState } from "../src/ai-conversation";
import type { DisplaySnapshot, UserState } from "../src/dashboard-model";

const base: UserState = {
  profile: { age: null, sex: "", heightCm: null, weightKg: null },
  activityEntries: [],
  fasting: { activeStartedAt: "", targetHours: 16, sessions: [] },
  bodyNotes: [],
  appleHealthImports: [],
  aiConversations: [],
  activeAiConversationId: "",
  backgroundJobs: [],
  developerLogs: [],
  llmCalls: [],
};

const display: DisplaySnapshot = {
  dbPath: "synthetic.sqlite3",
  organs: [{ key: "blood", name: "Blood", system: "Circulatory", status: "monitor", labCount: 2, symptomCount: 0 }],
  latestLabResults: [
    { id: 2, reportId: null, reportSourceName: null, reportLocalCopyPath: null, organKey: "blood", marker: "Ferritin", value: "24", valueNumber: 24, unit: "ng/mL", status: "monitor", flag: "normal", measuredAt: "2026-07-01", notes: "synthetic sample", referenceRange: "15-150", referenceLow: 15, referenceHigh: 150 },
    { id: 1, reportId: null, reportSourceName: null, reportLocalCopyPath: null, organKey: "blood", marker: "Ferritin", value: "12", valueNumber: 12, unit: "ng/mL", status: "attention", flag: "low", measuredAt: "2026-01-01", notes: "synthetic sample", referenceRange: "15-150", referenceLow: 15, referenceHigh: 150 },
  ],
  recentSymptoms: [],
  conditions: [],
  regimenItems: [],
  aiRecommendations: [],
  labReports: [],
};

test("mergeAiConversationState preserves non-AI user state", () => {
  const current: UserState = {
    ...base,
    profile: { age: 42, sex: "other", heightCm: 170, weightKg: 70 },
    activityEntries: [{ id: "activity", loggedAt: "2026-07-08", cigarettes: 0, drinks: 0, activityName: "Walk", durationMinutes: 20, notes: "" }],
  };
  const next: UserState = {
    ...base,
    aiConversations: [{ id: "chat", title: "Question", createdAt: "2026-07-08T00:00:00.000Z", updatedAt: "2026-07-08T00:00:00.000Z", messages: [] }],
    activeAiConversationId: "chat",
  };

  assert.deepEqual(mergeAiConversationState(current, next), { ...current, aiConversations: next.aiConversations, activeAiConversationId: "chat" });
});

test("getActiveAiConversation returns null for a new empty thread state", () => {
  const state: UserState = {
    ...base,
    aiConversations: [{ id: "chat", title: "Question", createdAt: "2026-07-08T00:00:00.000Z", updatedAt: "2026-07-08T00:00:00.000Z", messages: [] }],
    activeAiConversationId: "",
  };

  assert.equal(getActiveAiConversation(state), null);
});

test("buildAiConversationPrompt keeps the latest generated prompt intact", () => {
  const longLatest = `${"marker ".repeat(500)}FINAL_MARKER`;
  const prompt = buildAiConversationPrompt({
    id: "chat",
    title: "Research",
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    messages: [
      { id: "old", role: "assistant", content: "older ".repeat(200), createdAt: "2026-07-08T00:00:00.000Z", providerId: "codex", modelId: "codex", isError: false },
      { id: "latest", role: "user", content: longLatest, createdAt: "2026-07-08T00:01:00.000Z", providerId: "codex", modelId: "codex", isError: false },
    ],
  }, display, base);

  assert.match(prompt, /FINAL_MARKER/u);
  assert.ok(prompt.includes(longLatest));
});

test("buildAiConversationPrompt includes dated lab history with the conversation", () => {
  const prompt = buildAiConversationPrompt({
    id: "chat",
    title: "Iron history",
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:01:00.000Z",
    messages: [{ id: "question", role: "user", content: "How is my ferritin?", createdAt: "2026-07-08T00:01:00.000Z", providerId: "codex", modelId: "codex", isError: false }],
  }, display, base);

  const payload = JSON.parse(prompt.slice(prompt.indexOf("{")));
  assert.deepEqual(payload.healthContext.labs.map((lab: { date: string; value: string }) => [lab.date, lab.value]), [["2026-07-01", "24"], ["2026-01-01", "12"]]);
  assert.deepEqual(Object.keys(payload.healthContext).sort(), ["activityHistory", "appleHealthImports", "bodyNotes", "conditions", "fasting", "labReports", "labs", "organStatuses", "profile", "regimen", "savedRecommendations", "symptoms"]);
  assert.equal(payload.conversation[0].content, "How is my ferritin?");
});
