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
  apiToken: string;
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
  { id: "minimal", label: t("aiConfig.effort.minimal"), description: t("aiConfig.effort.minimalDescription") },
  { id: "low", label: t("aiConfig.effort.low"), description: t("aiConfig.effort.lowDescription") },
  { id: "medium", label: t("aiConfig.effort.medium"), description: t("aiConfig.effort.mediumDescription") },
  { id: "high", label: t("aiConfig.effort.high"), description: t("aiConfig.effort.highDescription") },
  { id: "xhigh", label: t("aiConfig.effort.xhigh"), description: t("aiConfig.effort.xhighDescription") },
];

export const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: "none",
    label: t("aiConfig.provider.none"),
    kind: "none",
    local: true,
    executionStatus: "disabled",
    statusLabel: t("aiConfig.status.setupRequired"),
    baseUrl: "",
    apiKeyEnvVar: "",
    models: [{ id: "", label: t("aiConfig.model.none") }],
  },
  {
    id: "codex",
    label: t("aiConfig.provider.codex"),
    kind: "codex-cli",
    local: false,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.live"),
    baseUrl: "",
    apiKeyEnvVar: "",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    ],
  },
  {
    id: "anthropic",
    label: t("aiConfig.provider.anthropic"),
    kind: "anthropic",
    local: false,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.live"),
    baseUrl: "",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "openai",
    label: t("aiConfig.provider.openai"),
    kind: "openai",
    local: false,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.live"),
    baseUrl: "",
    apiKeyEnvVar: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    id: "gemini",
    label: t("aiConfig.provider.gemini"),
    kind: "google",
    local: false,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.live"),
    baseUrl: "",
    apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  {
    id: "lmstudio",
    label: t("aiConfig.provider.lmStudio"),
    kind: "openai-compatible",
    local: true,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.localLive"),
    baseUrl: "http://localhost:1234/v1",
    apiKeyEnvVar: "",
    models: [{ id: "local-model", label: t("aiConfig.model.local") }],
  },
  {
    id: "ollama",
    label: t("aiConfig.provider.ollama"),
    kind: "openai-compatible",
    local: true,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.localLive"),
    baseUrl: "http://localhost:11434/v1",
    apiKeyEnvVar: "",
    models: [
      { id: "llama3.2", label: "Llama 3.2" },
      { id: "mistral", label: "Mistral" },
    ],
  },
  {
    id: "custom",
    label: t("aiConfig.provider.custom"),
    kind: "openai-compatible",
    local: false,
    executionStatus: "live",
    statusLabel: t("aiConfig.status.live"),
    baseUrl: "",
    apiKeyEnvVar: "",
    models: [{ id: "model-id", label: t("aiConfig.model.custom") }],
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
    apiKeyEnvVar: provider.id === "lmstudio" ? "" : (input.apiKeyEnvVar || provider.apiKeyEnvVar).trim(),
    apiToken: provider.id === "lmstudio" ? (input.apiToken || "").trim() : "",
    allowRemoteHealthContext: input.allowRemoteHealthContext === true,
  };
}

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

export function hasEnabledAiModel(settings: Pick<AiSettings, "providerId" | "modelId" | "baseUrl" | "apiKeyEnvVar" | "allowRemoteHealthContext">): boolean {
  const provider = getAiProvider(settings.providerId);
  const hasRequiredApiKeyEnvVar = provider.kind !== "anthropic" && provider.kind !== "openai" && provider.kind !== "google"
    || settings.apiKeyEnvVar.trim() !== "";
  const hasRequiredBaseUrl = provider.kind !== "openai-compatible" || settings.baseUrl.trim() !== "";
  return provider.id !== "none"
    && provider.executionStatus === "live"
    && settings.modelId.trim() !== ""
    && hasRequiredApiKeyEnvVar
    && hasRequiredBaseUrl
    && (provider.local || settings.allowRemoteHealthContext);
}

export function isApiKeyEnvVarName(value: string): boolean {
  const name = value.trim();
  return name === "" || /^[A-Z_][A-Z0-9_]*$/u.test(name);
}
import { t } from "./i18n";
