export type AiProviderKind = "none" | "anthropic" | "openai" | "google" | "openai-compatible" | "codex-cli";
export type AiProviderExecutionStatus = "disabled" | "live" | "planned";

export type AiModelOption = {
  id: string;
  label: string;
};

export type CodexReasoningEffortOption = AiModelOption & {
  description: string;
};

export type CodexModelOption = AiModelOption & {
  defaultReasoningEffort: string;
  reasoningEfforts: CodexReasoningEffortOption[];
};

export type AiProviderConfig = {
  id: string;
  label: string;
  kind: AiProviderKind;
  local: boolean;
  executionStatus: AiProviderExecutionStatus;
  statusLabel: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  models: AiModelOption[];
};

export type AiSettings = {
  providerId: string;
  modelId: string;
  reasoningEffort: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  allowRemoteHealthContext: boolean;
};

export type AiSdkTarget = {
  provider: AiProviderKind;
  model: string;
  reasoningEffort?: string;
  baseURL?: string;
  apiKeyEnvVar?: string;
};

export const DEFAULT_AI_PROVIDER_ID = "none";
export const DEFAULT_CODEX_REASONING_EFFORT = "medium";
export const CODEX_REASONING_EFFORT_OPTIONS: CodexReasoningEffortOption[] = [
  { id: "minimal", label: "Minimal", description: "Shortest thinking time" },
  { id: "low", label: "Low", description: "Fast responses with lighter reasoning" },
  { id: "medium", label: "Medium", description: "Balanced speed and depth" },
  { id: "high", label: "High", description: "Deeper reasoning for complex work" },
  { id: "xhigh", label: "Extra high", description: "Maximum available reasoning depth" },
];

export const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: "none",
    label: "Not configured",
    kind: "none",
    local: true,
    executionStatus: "disabled",
    statusLabel: "Setup required",
    baseUrl: "",
    apiKeyEnvVar: "",
    models: [{ id: "", label: "No model selected" }],
  },
  {
    id: "codex",
    label: "Codex CLI",
    kind: "codex-cli",
    local: false,
    executionStatus: "live",
    statusLabel: "Live via Codex CLI",
    baseUrl: "",
    apiKeyEnvVar: "",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    local: false,
    executionStatus: "planned",
    statusLabel: "Planned, not live",
    baseUrl: "",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    local: false,
    executionStatus: "planned",
    statusLabel: "Planned, not live",
    baseUrl: "",
    apiKeyEnvVar: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    kind: "google",
    local: false,
    executionStatus: "planned",
    statusLabel: "Planned, not live",
    baseUrl: "",
    apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    kind: "openai-compatible",
    local: true,
    executionStatus: "planned",
    statusLabel: "Planned local provider",
    baseUrl: "http://localhost:1234/v1",
    apiKeyEnvVar: "",
    models: [{ id: "local-model", label: "Local model" }],
  },
  {
    id: "ollama",
    label: "Ollama",
    kind: "openai-compatible",
    local: true,
    executionStatus: "planned",
    statusLabel: "Planned local provider",
    baseUrl: "http://localhost:11434/v1",
    apiKeyEnvVar: "",
    models: [
      { id: "llama3.2", label: "Llama 3.2" },
      { id: "mistral", label: "Mistral" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    kind: "openai-compatible",
    local: false,
    executionStatus: "planned",
    statusLabel: "Planned, not live",
    baseUrl: "",
    apiKeyEnvVar: "",
    models: [{ id: "model-id", label: "Custom model" }],
  },
];

export const LIVE_AI_PROVIDERS = AI_PROVIDERS.filter((provider) => provider.executionStatus === "live");

export function getAiProvider(providerId: string): AiProviderConfig {
  return AI_PROVIDERS.find((provider) => provider.id === providerId) || AI_PROVIDERS[0];
}

export function normalizeAiSettings(input: Partial<AiSettings> = {}): AiSettings {
  const provider = getAiProvider(input.providerId || DEFAULT_AI_PROVIDER_ID);
  const modelId = input.modelId === "codex-cli" ? "" : input.modelId;
  return {
    providerId: provider.id,
    modelId: (modelId || provider.models[0]?.id || "").trim(),
    reasoningEffort: (input.reasoningEffort || DEFAULT_CODEX_REASONING_EFFORT).trim(),
    baseUrl: (input.baseUrl || provider.baseUrl).trim(),
    apiKeyEnvVar: (input.apiKeyEnvVar || provider.apiKeyEnvVar).trim(),
    allowRemoteHealthContext: input.allowRemoteHealthContext === true,
  };
}

/** Planned adapter mapping. No user-facing path executes this until providers are live. */
export function toAiSdkTarget(settings: AiSettings): AiSdkTarget {
  const provider = getAiProvider(settings.providerId);
  return {
    provider: provider.kind,
    model: settings.modelId,
    reasoningEffort: settings.reasoningEffort || undefined,
    baseURL: settings.baseUrl || undefined,
    apiKeyEnvVar: settings.apiKeyEnvVar || undefined,
  };
}

export function isAiProviderLive(providerId: string): boolean {
  return getAiProvider(providerId).executionStatus === "live";
}

export function hasEnabledCodexModel(settings: Pick<AiSettings, "providerId" | "modelId" | "allowRemoteHealthContext">): boolean {
  return settings.providerId === "codex" && settings.allowRemoteHealthContext && settings.modelId.trim() !== "";
}

export function isApiKeyEnvVarName(value: string): boolean {
  const name = value.trim();
  return name === "" || /^[A-Z_][A-Z0-9_]*$/u.test(name);
}
