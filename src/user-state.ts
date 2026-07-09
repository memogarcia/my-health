import { todayString } from "./dashboard-format";
import { type ActivityEntry, type UserProfile } from "./dashboard-model";
import { isApiKeyEnvVarName, normalizeAiSettings, type AiSettings } from "./ai-sdk-config";
import { t } from "./i18n";

export function profileFromForm(form: FormData): UserProfile {
  return {
    age: optionalNumber(form, "age"),
    sex: String(form.get("sex") || ""),
    heightCm: optionalNumber(form, "heightCm"),
    weightKg: optionalNumber(form, "weightKg"),
  };
}

export function aiSettingsFromForm(form: FormData): AiSettings {
  const apiKeyEnvVar = String(form.get("apiKeyEnvVar") || "");
  if (!isApiKeyEnvVarName(apiKeyEnvVar)) {
    throw new Error(t("userState.apiKeyEnvVar"));
  }
  return normalizeAiSettings({
    providerId: String(form.get("providerId") || ""),
    modelId: String(form.get("modelId") || ""),
    reasoningEffort: String(form.get("reasoningEffort") || ""),
    baseUrl: String(form.get("baseUrl") || ""),
    apiKeyEnvVar,
    allowRemoteHealthContext: form.get("allowRemoteHealthContext") === "on",
  });
}

export function activityFromForm(form: FormData): ActivityEntry {
  const notes = String(form.get("notes") || form.get("prompt") || "").trim();
  const activityName = String(form.get("activityName") || "").trim() || promptTitle(notes);
  return {
    id: makeId(),
    loggedAt: String(form.get("loggedAt") || todayString()),
    cigarettes: nonNegativeInteger(form, "cigarettes"),
    drinks: nonNegativeInteger(form, "drinks"),
    activityName,
    durationMinutes: nonNegativeInteger(form, "durationMinutes"),
    notes,
  };
}

function nonNegativeInteger(form: FormData, name: string): number {
  const value = String(form.get(name) || "").trim();
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function optionalNumber(form: FormData, name: string): number | null {
  const value = String(form.get(name) || "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function promptTitle(prompt: string): string {
  return prompt.split(/[.!?\n]/u)[0]?.trim().slice(0, 60) || t("dashboard.dailyEntry");
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
