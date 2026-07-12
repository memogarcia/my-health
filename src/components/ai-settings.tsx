import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AI_PROVIDERS,
  CODEX_REASONING_EFFORT_OPTIONS,
  DEFAULT_CODEX_REASONING_EFFORT,
  getAiProvider,
  isApiKeyEnvVarName,
  isLoopbackAiBaseUrl,
} from "../ai-sdk-config";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

export function AiSettings({ controller }: { controller: DashboardController }) {
  const [providerId, setProviderId] = useState(controller.aiSettings.providerId);
  const [modelId, setModelId] = useState(controller.aiSettings.modelId);
  const [reasoningEffort, setReasoningEffort] = useState(controller.aiSettings.reasoningEffort);
  const [baseUrl, setBaseUrl] = useState(controller.aiSettings.baseUrl);
  const [apiKeyEnvVar, setApiKeyEnvVar] = useState(controller.aiSettings.apiKeyEnvVar);
  const [apiToken, setApiToken] = useState(controller.aiSettings.apiToken);
  const [allowRemote, setAllowRemote] = useState(controller.aiSettings.allowRemoteHealthContext);
  const provider = getAiProvider(providerId);
  const isCodex = provider.id === "codex";
  const hasProviderConfiguration = provider.id !== "none";
  const showBaseUrl = provider.kind === "openai-compatible";
  const showApiToken = provider.id === "lmstudio";
  const showApiKeyEnvVar = !showApiToken && provider.kind !== "none" && provider.kind !== "codex-cli";
  const apiKeyEnvVarRequired = provider.kind === "anthropic" || provider.kind === "openai" || provider.kind === "google";
  const apiKeyEnvVarPlaceholder = provider.apiKeyEnvVar || t("settings.ai.apiKeyEnvVarPlaceholder");
  const staysOnDevice = showBaseUrl && isLoopbackAiBaseUrl(baseUrl);
  const showRemoteConsent = hasProviderConfiguration && !staysOnDevice;
  const runtimeStatus = staysOnDevice ? t("aiConfig.status.localLive") : provider.statusLabel;
  const fallbackCodexModels = provider.models.map((item) => ({
    ...item,
    defaultReasoningEffort: DEFAULT_CODEX_REASONING_EFFORT,
    reasoningEfforts: CODEX_REASONING_EFFORT_OPTIONS,
  }));
  const codexModelOptions = controller.codexModels.length ? controller.codexModels : fallbackCodexModels;
  const selectedCodexModel = codexModelOptions.find((item) => item.id === modelId) || codexModelOptions[0];
  const reasoningOptions = selectedCodexModel?.reasoningEfforts.length ? selectedCodexModel.reasoningEfforts : CODEX_REASONING_EFFORT_OPTIONS;
  const modelMissing = hasProviderConfiguration && modelId.trim() === "";
  const reasoningEffortMissing = isCodex && reasoningEffort.trim() === "";
  const baseUrlMissing = showBaseUrl && baseUrl.trim() === "";
  const apiKeyEnvVarMissing = apiKeyEnvVarRequired && apiKeyEnvVar.trim() === "";
  const apiKeyEnvVarInvalid = showApiKeyEnvVar && !isApiKeyEnvVarName(apiKeyEnvVar);
  const settingsValid = !hasProviderConfiguration || (!modelMissing && !reasoningEffortMissing && !baseUrlMissing && !apiKeyEnvVarMissing && !apiKeyEnvVarInvalid);
  const validationMessage = modelMissing
      ? t("settings.ai.modelRequired")
      : reasoningEffortMissing
        ? t("settings.ai.reasoningEffortRequired")
        : baseUrlMissing
          ? t("settings.ai.baseUrlRequired")
          : apiKeyEnvVarMissing
            ? t("settings.ai.apiKeyEnvVarRequired")
            : apiKeyEnvVarInvalid
              ? t("userState.apiKeyEnvVar")
              : "";

  useEffect(() => {
    setProviderId(controller.aiSettings.providerId);
    setModelId(controller.aiSettings.modelId);
    setReasoningEffort(controller.aiSettings.reasoningEffort);
    setBaseUrl(controller.aiSettings.baseUrl);
    setApiKeyEnvVar(controller.aiSettings.apiKeyEnvVar);
    setApiToken(controller.aiSettings.apiToken);
    setAllowRemote(controller.aiSettings.allowRemoteHealthContext);
  }, [controller.aiSettings]);

  useEffect(() => {
    if (providerId !== "codex") return;
    const models = controller.codexModels;
    const selected = models.find((item) => item.id === modelId) || models[0];
    if (selected && !models.some((item) => item.id === modelId)) setModelId(selected.id);
    if (selected && !selected.reasoningEfforts.some((item) => item.id === reasoningEffort)) {
      setReasoningEffort(selected.defaultReasoningEffort || selected.reasoningEfforts[0]?.id || DEFAULT_CODEX_REASONING_EFFORT);
    }
  }, [providerId, controller.codexModels, modelId, reasoningEffort]);

  function selectCodexModel(value: string): void {
    setModelId(value);
    const selected = codexModelOptions.find((item) => item.id === value);
    if (selected && !selected.reasoningEfforts.some((item) => item.id === reasoningEffort)) {
      setReasoningEffort(selected.defaultReasoningEffort || selected.reasoningEfforts[0]?.id || DEFAULT_CODEX_REASONING_EFFORT);
    }
  }

  function selectProvider(value: string): void {
    const nextProvider = getAiProvider(value);
    setProviderId(nextProvider.id);
    setModelId(nextProvider.models[0]?.id || "");
    setReasoningEffort(DEFAULT_CODEX_REASONING_EFFORT);
    setBaseUrl(nextProvider.baseUrl);
    setApiKeyEnvVar(nextProvider.apiKeyEnvVar);
    setApiToken("");
    setAllowRemote(false);
    if (nextProvider.id === "codex") void controller.loadCodexOptions();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.ai.title")}</CardTitle>
        <CardDescription>{runtimeStatus}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!settingsValid) return;
          const form = new FormData(event.currentTarget);
          form.set("providerId", providerId);
          form.set("modelId", modelId);
          form.set("reasoningEffort", reasoningEffort);
          form.set("baseUrl", baseUrl);
          form.set("apiKeyEnvVar", apiKeyEnvVar);
          form.set("apiToken", apiToken);
          if (allowRemote) form.set("allowRemoteHealthContext", "on");
          void controller.saveAiSettings(form);
        }}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ai-provider">{t("settings.ai.provider")}</FieldLabel>
              <Select value={providerId} onValueChange={selectProvider}>
                <SelectTrigger className="w-full" id="ai-provider"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>{AI_PROVIDERS.map((item) => <SelectItem value={item.id} key={item.id}>{item.label} · {item.statusLabel}</SelectItem>)}</SelectGroup>
                </SelectContent>
              </Select>
              {provider.executionStatus === "planned" ? <FieldDescription>{t("settings.ai.notLiveWarning")}</FieldDescription> : null}
            </Field>
            {hasProviderConfiguration ? (
              <Field data-invalid={modelMissing ? "true" : undefined}>
                <FieldLabel htmlFor="modelId">{t("settings.ai.model")}</FieldLabel>
                {isCodex ? (
                  <>
                    <Select value={modelId} onValueChange={selectCodexModel}>
                      <SelectTrigger className="w-full" id="modelId" aria-invalid={modelMissing}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>{codexModelOptions.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}</SelectGroup>
                      </SelectContent>
                    </Select>
                    {controller.codexOptionsError ? <FieldDescription>{controller.codexOptionsError}</FieldDescription> : null}
                  </>
                ) : (
                  <>
                    <Input id="modelId" name="modelId" list="ai-model-options" value={modelId} onChange={(event) => setModelId(event.target.value)} aria-invalid={modelMissing} required />
                    <datalist id="ai-model-options">{provider.models.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</datalist>
                  </>
                )}
              </Field>
            ) : null}
            {isCodex ? (
              <Field data-invalid={reasoningEffortMissing ? "true" : undefined}>
                <FieldLabel htmlFor="reasoning-effort">{t("settings.ai.thinkingEffort")}</FieldLabel>
                <Select value={reasoningEffort} onValueChange={setReasoningEffort}>
                  <SelectTrigger className="w-full" id="reasoning-effort" aria-invalid={reasoningEffortMissing}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>{reasoningOptions.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}</SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{reasoningOptions.find((item) => item.id === reasoningEffort)?.description || t("settings.ai.thinkingEffortDescription")}</FieldDescription>
              </Field>
            ) : null}
            {showBaseUrl ? (
              <Field data-invalid={baseUrlMissing ? "true" : undefined}>
                <FieldLabel htmlFor="baseUrl">{t("settings.ai.baseUrl")}</FieldLabel>
                <Input id="baseUrl" name="baseUrl" type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={provider.baseUrl || t("settings.ai.baseUrlPlaceholder")} aria-invalid={baseUrlMissing} required />
              </Field>
            ) : null}
            {showApiKeyEnvVar ? (
              <Field data-invalid={apiKeyEnvVarMissing || apiKeyEnvVarInvalid ? "true" : undefined}>
                <FieldLabel htmlFor="apiKeyEnvVar">{t("settings.ai.apiKeyEnvVar")}</FieldLabel>
                <Input
                  id="apiKeyEnvVar"
                  name="apiKeyEnvVar"
                  value={apiKeyEnvVar}
                  onChange={(event) => setApiKeyEnvVar(event.target.value)}
                  placeholder={apiKeyEnvVarPlaceholder}
                  pattern="[A-Z_][A-Z0-9_]*"
                  aria-invalid={apiKeyEnvVarMissing || apiKeyEnvVarInvalid}
                  required={apiKeyEnvVarRequired}
                />
              </Field>
            ) : null}
            {showApiToken ? (
              <Field>
                <FieldLabel htmlFor="apiToken">{t("settings.ai.apiTokenLmStudio")}</FieldLabel>
                <Input
                  id="apiToken"
                  name="apiToken"
                  value={apiToken}
                  onChange={(event) => setApiToken(event.target.value)}
                  placeholder={t("settings.ai.apiTokenLmStudioPlaceholder")}
                  type="password"
                  autoComplete="off"
                />
                <FieldDescription>{t("settings.ai.apiTokenLmStudioDescription")}</FieldDescription>
              </Field>
            ) : null}
            {showRemoteConsent ? (
              <Field orientation="horizontal" className="sm:col-span-2 rounded-sm border border-border bg-secondary p-3">
                <Checkbox aria-describedby="ai-remote-description" checked={allowRemote} onCheckedChange={(checked) => setAllowRemote(checked === true)} id="allowRemoteHealthContext" />
                <FieldContent>
                  <FieldLabel htmlFor="allowRemoteHealthContext">{t("settings.ai.allowRemoteTitle")}</FieldLabel>
                  <FieldDescription id="ai-remote-description">{t("settings.ai.allowRemoteDescription")}</FieldDescription>
                </FieldContent>
              </Field>
            ) : null}
            {validationMessage ? (
              <FieldDescription className="sm:col-span-2" id="ai-settings-validation" role="status" aria-live="polite">
                {validationMessage}
              </FieldDescription>
            ) : null}
            <Button
              className="sm:col-span-2 sm:justify-self-end"
              type="submit"
              disabled={!settingsValid}
              aria-describedby={validationMessage ? "ai-settings-validation" : undefined}
            >
              {t("settings.ai.save")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
