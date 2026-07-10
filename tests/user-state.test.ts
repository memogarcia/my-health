import test from "node:test";
import assert from "node:assert/strict";
import { summarizeAppleHealthFile } from "../src/apple-health-import";
import { hasEnabledAiModel, hasEnabledCodexModel, normalizeAiSettings } from "../src/ai-sdk-config";
import { activityFromForm, aiSettingsFromForm } from "../src/user-state";
import type { AppleHealthImport } from "../src/dashboard-model";

test("aiSettingsFromForm rejects raw API key-looking text", () => {
  const form = new FormData();
  form.set("providerId", "openai");
  form.set("modelId", "gpt-4o-mini");
  form.set("apiKeyEnvVar", "sk-proj-secret");

  assert.throws(() => aiSettingsFromForm(form), /environment variable name/);
});

test("aiSettingsFromForm stores LM Studio token from settings", () => {
  const form = new FormData();
  form.set("providerId", "lmstudio");
  form.set("modelId", "local-model");
  form.set("baseUrl", "http://localhost:1234/v1");
  form.set("apiToken", "lm-studio-token");

  const settings = aiSettingsFromForm(form);

  assert.equal(settings.apiToken, "lm-studio-token");
  assert.equal(settings.apiKeyEnvVar, "");
});

test("aiSettingsFromForm strips raw token for remote providers", () => {
  const form = new FormData();
  form.set("providerId", "openai");
  form.set("modelId", "gpt-4o-mini");
  form.set("apiKeyEnvVar", "OPENAI_API_KEY");
  form.set("apiToken", "sk-proj-secret");

  assert.equal(aiSettingsFromForm(form).apiToken, "");
});

test("normalizeAiSettings defaults to an explicit unconfigured provider", () => {
  assert.equal(normalizeAiSettings().providerId, "none");
});

test("hasEnabledCodexModel requires Codex, consent, and a model", () => {
  assert.equal(hasEnabledCodexModel({ providerId: "openai", modelId: "gpt-4o", allowRemoteHealthContext: true }), false);
  assert.equal(hasEnabledCodexModel({ providerId: "codex", modelId: "gpt-5.5", allowRemoteHealthContext: false }), false);
  assert.equal(hasEnabledCodexModel({ providerId: "codex", modelId: " ", allowRemoteHealthContext: true }), false);
  assert.equal(hasEnabledCodexModel({ providerId: "codex", modelId: "gpt-5.5", allowRemoteHealthContext: true }), true);
});

test("hasEnabledAiModel allows configured non-Codex providers", () => {
  assert.equal(hasEnabledAiModel({ providerId: "openai", modelId: "gpt-4o", baseUrl: "", apiKeyEnvVar: "OPENAI_API_KEY", allowRemoteHealthContext: true }), true);
  assert.equal(hasEnabledAiModel({ providerId: "openai", modelId: "gpt-4o", baseUrl: "", apiKeyEnvVar: "OPENAI_API_KEY", allowRemoteHealthContext: false }), false);
  assert.equal(hasEnabledAiModel({ providerId: "ollama", modelId: "llama3.2", baseUrl: "http://localhost:11434/v1", apiKeyEnvVar: "", allowRemoteHealthContext: false }), true);
});

test("activityFromForm maps structured fields and clamps negatives", () => {
  const form = new FormData();
  form.set("loggedAt", "2026-07-09");
  form.set("activityName", "Walk");
  form.set("durationMinutes", "30");
  form.set("cigarettes", "-2");
  form.set("drinks", "1");
  form.set("notes", "synthetic note");

  const activity = activityFromForm(form);

  assert.equal(activity.loggedAt, "2026-07-09");
  assert.equal(activity.activityName, "Walk");
  assert.equal(activity.durationMinutes, 30);
  assert.equal(activity.cigarettes, 0);
  assert.equal(activity.drinks, 1);
  assert.equal(activity.notes, "synthetic note");
});

test("summarizeAppleHealthFile rejects oversized XML before parsing", async () => {
  const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "export.xml", { type: "text/xml" });

  await assert.rejects(() => summarizeAppleHealthFile(file), /too large/);
});

test("summarizeAppleHealthFile sends accepted XML to a worker", async () => {
  const originalWorker = globalThis.Worker;
  const summary: AppleHealthImport = {
    id: "import",
    sourceName: "export.xml",
    importedAt: "2026-07-08",
    recordCount: 1,
    workoutCount: 0,
    startedAt: "2026-07-01",
    endedAt: "2026-07-01",
  };
  const file = {
    name: "export.xml",
    size: 20,
    text: async () => {
      throw new Error("main thread read");
    },
  } as unknown as File;

  class FakeWorker {
    onmessage: ((event: MessageEvent<{ summary: AppleHealthImport }>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    constructor(public url: URL, public options: WorkerOptions) {}
    postMessage(message: { file: File }) {
      assert.equal(message.file, file);
      queueMicrotask(() => this.onmessage?.({ data: { summary } } as MessageEvent<{ summary: AppleHealthImport }>));
    }
    terminate() {}
  }

  try {
    globalThis.Worker = FakeWorker as unknown as typeof Worker;
    const result = await summarizeAppleHealthFile(file);
    assert.equal(result, summary);
  } finally {
    globalThis.Worker = originalWorker;
  }
});
