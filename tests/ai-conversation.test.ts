import test from "node:test";
import assert from "node:assert/strict";
import { buildCodexConversationPrompt, getActiveAiConversation, mergeAiConversationState } from "../src/ai-conversation";
import type { UserState } from "../src/dashboard-model";

const base: UserState = {
  profile: { age: null, sex: "", heightCm: null, weightKg: null },
  activityEntries: [],
  appleHealthImports: [],
  aiConversations: [],
  activeAiConversationId: "",
  backgroundJobs: [],
  developerLogs: [],
  llmCalls: [],
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

test("buildCodexConversationPrompt keeps the latest generated prompt intact", () => {
  const longLatest = `${"marker ".repeat(500)}FINAL_MARKER`;
  const prompt = buildCodexConversationPrompt({
    id: "chat",
    title: "Research",
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    messages: [
      { id: "old", role: "assistant", content: "older ".repeat(200), createdAt: "2026-07-08T00:00:00.000Z", providerId: "codex", modelId: "codex", isError: false },
      { id: "latest", role: "user", content: longLatest, createdAt: "2026-07-08T00:01:00.000Z", providerId: "codex", modelId: "codex", isError: false },
    ],
  });

  assert.match(prompt, /FINAL_MARKER/u);
  assert.ok(prompt.includes(longLatest));
});
