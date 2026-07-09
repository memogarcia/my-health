import test from "node:test";
import assert from "node:assert/strict";
import { summarizeAppleHealthFile } from "../src/apple-health-import";
import { hasEnabledCodexModel } from "../src/ai-sdk-config";
import { aiSettingsFromForm } from "../src/user-state";
import type { AppleHealthImport } from "../src/dashboard-model";

test("aiSettingsFromForm rejects raw API key-looking text", () => {
  const form = new FormData();
  form.set("providerId", "openai");
  form.set("modelId", "gpt-4o-mini");
  form.set("apiKeyEnvVar", "sk-proj-secret");

  assert.throws(() => aiSettingsFromForm(form), /environment variable name/);
});

test("hasEnabledCodexModel requires Codex, consent, and a model", () => {
  assert.equal(hasEnabledCodexModel({ providerId: "openai", modelId: "gpt-4o", allowRemoteHealthContext: true }), false);
  assert.equal(hasEnabledCodexModel({ providerId: "codex", modelId: "gpt-5.5", allowRemoteHealthContext: false }), false);
  assert.equal(hasEnabledCodexModel({ providerId: "codex", modelId: " ", allowRemoteHealthContext: true }), false);
  assert.equal(hasEnabledCodexModel({ providerId: "codex", modelId: "gpt-5.5", allowRemoteHealthContext: true }), true);
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
  } as File;

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
