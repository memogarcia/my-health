export type DeveloperLogLevel = "info" | "success" | "error";
export type DeveloperLogArea = "document" | "chat" | "system";

export type DeveloperLog = {
  id: string;
  createdAt: string;
  level: DeveloperLogLevel;
  area: DeveloperLogArea;
  message: string;
  detail: string;
};

export type DeveloperLogInput = Pick<DeveloperLog, "level" | "area" | "message" | "detail">;

export type LlmCallKind = "chat" | "document-analysis";
export type LlmCallStatus = "running" | "completed" | "failed";

export type LlmCall = {
  id: string;
  kind: LlmCallKind;
  command: string;
  inputLabel: string;
  modelId: string;
  reasoningEffort: string;
  status: LlmCallStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number | null;
  promptChars: number;
  fileBytes: number;
  renderedPages: number;
  outputChars: number;
  error: string;
};

export type LlmCallInput = Pick<LlmCall, "kind" | "command" | "inputLabel" | "modelId" | "reasoningEffort" | "promptChars" | "fileBytes" | "renderedPages">;
export type LlmCallPatch = Partial<Pick<LlmCall, "status" | "outputChars" | "error">>;

export function normalizeDeveloperLog(entry: Partial<DeveloperLog>): DeveloperLog {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    level: entry.level === "success" || entry.level === "error" ? entry.level : "info",
    area: entry.area === "document" || entry.area === "chat" ? entry.area : "system",
    message: typeof entry.message === "string" ? limitText(entry.message, 180) : "",
    detail: typeof entry.detail === "string" ? limitText(entry.detail, 1200) : "",
  };
}

export function normalizeLlmCall(entry: Partial<LlmCall>): LlmCall {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    kind: entry.kind === "document-analysis" ? "document-analysis" : "chat",
    command: typeof entry.command === "string" ? limitText(entry.command, 80) : "",
    inputLabel: typeof entry.inputLabel === "string" ? limitText(entry.inputLabel, 180) : "",
    modelId: typeof entry.modelId === "string" ? limitText(entry.modelId, 120) : "",
    reasoningEffort: typeof entry.reasoningEffort === "string" ? limitText(entry.reasoningEffort, 40) : "",
    status: entry.status === "completed" || entry.status === "failed" ? entry.status : "running",
    startedAt: typeof entry.startedAt === "string" ? entry.startedAt : "",
    finishedAt: typeof entry.finishedAt === "string" ? entry.finishedAt : "",
    durationMs: typeof entry.durationMs === "number" && Number.isFinite(entry.durationMs) ? Math.max(0, Math.round(entry.durationMs)) : null,
    promptChars: numberOrZero(entry.promptChars),
    fileBytes: numberOrZero(entry.fileBytes),
    renderedPages: numberOrZero(entry.renderedPages),
    outputChars: numberOrZero(entry.outputChars),
    error: typeof entry.error === "string" ? limitText(entry.error, 1200) : "",
  };
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function limitText(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}
