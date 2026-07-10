import type { DeveloperLog, DeveloperLogInput, LlmCall, LlmCallInput, LlmCallPatch } from "./developer-diagnostics";
import { normalizeUserState, type UserState } from "./dashboard-model";

type DeveloperDiagnosticsOptions = {
  getUserState: () => UserState;
  setUserState: (next: UserState) => void;
  persistUserState: (next: UserState) => Promise<boolean>;
};

export function makeDeveloperDiagnostics(options: DeveloperDiagnosticsOptions) {
  function commit(next: UserState): void {
    options.setUserState(next);
    void options.persistUserState(next);
  }

  function recordDeveloperLog(input: DeveloperLogInput): void {
    const log: DeveloperLog = { id: newLocalId(), createdAt: new Date().toISOString(), ...input };
    commit(normalizeUserState({
      ...options.getUserState(),
      developerLogs: [log, ...options.getUserState().developerLogs].slice(0, 120),
    }));
  }

  function startLlmCall(input: LlmCallInput): string {
    const call: LlmCall = {
      id: newLocalId(),
      ...input,
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: "",
      durationMs: null,
      outputChars: 0,
      error: "",
    };
    commit(normalizeUserState({
      ...options.getUserState(),
      llmCalls: [call, ...options.getUserState().llmCalls].slice(0, 40),
    }));
    return call.id;
  }

  function updateLlmCall(callId: string, patch: LlmCallPatch): void {
    const current = options.getUserState();
    const existing = current.llmCalls.find((call) => call.id === callId);
    if (!existing) return;
    const finishedAt = patch.status && patch.status !== "running" ? new Date().toISOString() : existing.finishedAt;
    const durationMs = finishedAt ? Math.max(0, Date.parse(finishedAt) - Date.parse(existing.startedAt)) : existing.durationMs;
    commit(normalizeUserState({
      ...current,
      llmCalls: current.llmCalls.map((call) => call.id !== callId ? call : { ...call, ...patch, finishedAt, durationMs }),
    }));
  }

  function clearDeveloperData(): void {
    commit(normalizeUserState({ ...options.getUserState(), developerLogs: [], llmCalls: [] }));
  }

  return { clearDeveloperData, recordDeveloperLog, startLlmCall, updateLlmCall };
}

function newLocalId(): string {
  return globalThis.crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
