import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_PROVIDERS, CODEX_REASONING_EFFORT_OPTIONS, DEFAULT_CODEX_REASONING_EFFORT, getAiProvider, type CodexModelOption } from "../ai-sdk-config";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Download } from "./health-icons";

export function SettingsPage({ controller }: { controller: DashboardController }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ProfileSettings controller={controller} />
      <div className="grid gap-4">
        <AiSettings controller={controller} />
        <DataExport controller={controller} />
      </div>
    </div>
  );
}

function ProfileSettings({ controller }: { controller: DashboardController }) {
  const profile = controller.userState.profile;
  const fieldCount = [profile.age, profile.sex, profile.heightCm, profile.weightKg].filter(Boolean).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile.title")}</CardTitle>
        <CardDescription>{fieldCount === 0 ? t("settings.profile.notSet") : t("settings.profile.fieldsSet", { count: fieldCount })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          void controller.saveProfile(new FormData(event.currentTarget));
        }}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <NumberField name="age" label={t("settings.profile.age")} value={profile.age} min={0} max={130} step={1} />
            <Field>
              <FieldLabel>{t("settings.profile.sex")}</FieldLabel>
              <Select name="sex" defaultValue={profile.sex}>
                <SelectTrigger className="w-full"><SelectValue placeholder={t("settings.profile.notSet")} /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="female">{t("settings.profile.sexFemale")}</SelectItem>
                    <SelectItem value="male">{t("settings.profile.sexMale")}</SelectItem>
                    <SelectItem value="intersex">{t("settings.profile.sexIntersex")}</SelectItem>
                    <SelectItem value="not_listed">{t("settings.profile.sexNotListed")}</SelectItem>
                    <SelectItem value="prefer_not_to_say">{t("settings.profile.sexPreferNot")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <NumberField name="heightCm" label={t("settings.profile.height")} value={profile.heightCm} min={0} step={0.1} />
            <NumberField name="weightKg" label={t("settings.profile.weight")} value={profile.weightKg} min={0} step={0.1} />
            <Button className="sm:col-span-2 sm:justify-self-end" type="submit">{t("settings.profile.save")}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function AiSettings({ controller }: { controller: DashboardController }) {
  const [providerId, setProviderId] = useState(controller.aiSettings.providerId);
  const [modelId, setModelId] = useState(controller.aiSettings.modelId);
  const [reasoningEffort, setReasoningEffort] = useState(controller.aiSettings.reasoningEffort);
  const [baseUrl, setBaseUrl] = useState(controller.aiSettings.baseUrl);
  const [apiKeyEnvVar, setApiKeyEnvVar] = useState(controller.aiSettings.apiKeyEnvVar);
  const [allowRemote, setAllowRemote] = useState(controller.aiSettings.allowRemoteHealthContext);
  const [codexModels, setCodexModels] = useState<CodexModelOption[]>([]);
  const [codexOptionsError, setCodexOptionsError] = useState("");
  const provider = getAiProvider(providerId);
  const isCodex = provider.id === "codex";
  const fallbackCodexModels = provider.models.map((item) => ({
    ...item,
    defaultReasoningEffort: DEFAULT_CODEX_REASONING_EFFORT,
    reasoningEfforts: CODEX_REASONING_EFFORT_OPTIONS,
  }));
  const codexModelOptions = codexModels.length ? codexModels : fallbackCodexModels;
  const selectedCodexModel = codexModelOptions.find((item) => item.id === modelId) || codexModelOptions[0];
  const reasoningOptions = selectedCodexModel?.reasoningEfforts.length ? selectedCodexModel.reasoningEfforts : CODEX_REASONING_EFFORT_OPTIONS;

  useEffect(() => {
    setProviderId(controller.aiSettings.providerId);
    setModelId(controller.aiSettings.modelId);
    setReasoningEffort(controller.aiSettings.reasoningEffort);
    setBaseUrl(controller.aiSettings.baseUrl);
    setApiKeyEnvVar(controller.aiSettings.apiKeyEnvVar);
    setAllowRemote(controller.aiSettings.allowRemoteHealthContext);
  }, [controller.aiSettings]);

  useEffect(() => {
    if (providerId !== "codex") return;
    let alive = true;
    invoke<{ models: CodexModelOption[] }>("get_codex_options")
      .then((result) => {
        if (!alive) return;
        const models = result.models || [];
        const selected = models.find((item) => item.id === modelId) || models[0];
        setCodexModels(models);
        setCodexOptionsError("");
        if (selected && !models.some((item) => item.id === modelId)) setModelId(selected.id);
        if (selected && !selected.reasoningEfforts.some((item) => item.id === reasoningEffort)) {
          setReasoningEffort(selected.defaultReasoningEffort || selected.reasoningEfforts[0]?.id || DEFAULT_CODEX_REASONING_EFFORT);
        }
      })
      .catch(() => {
        if (!alive) return;
        setCodexModels([]);
        setCodexOptionsError(t("settings.ai.codexModelsUnavailable"));
      });
    return () => {
      alive = false;
    };
  }, [providerId]);

  function selectCodexModel(value: string): void {
    setModelId(value);
    const selected = codexModelOptions.find((item) => item.id === value);
    if (selected && !selected.reasoningEfforts.some((item) => item.id === reasoningEffort)) {
      setReasoningEffort(selected.defaultReasoningEffort || selected.reasoningEfforts[0]?.id || DEFAULT_CODEX_REASONING_EFFORT);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.ai.title")}</CardTitle>
        <CardDescription>{provider.kind}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          form.set("providerId", providerId);
          form.set("modelId", modelId);
          form.set("reasoningEffort", reasoningEffort);
          if (allowRemote) form.set("allowRemoteHealthContext", "on");
          void controller.saveAiSettings(form);
        }}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("settings.ai.provider")}</FieldLabel>
              <Select value={providerId} onValueChange={(value) => {
                setProviderId(value);
                void controller.updateAiProvider(value, "settings");
              }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>{AI_PROVIDERS.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}</SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="modelId">{t("settings.ai.model")}</FieldLabel>
              {isCodex ? (
                <>
                  <Select value={modelId} onValueChange={selectCodexModel}>
                    <SelectTrigger className="w-full" id="modelId"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>{codexModelOptions.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}</SelectGroup>
                    </SelectContent>
                  </Select>
                  {codexOptionsError ? <FieldDescription>{codexOptionsError}</FieldDescription> : null}
                </>
              ) : (
                <>
                  <Input id="modelId" name="modelId" list="ai-model-options" value={modelId} onChange={(event) => setModelId(event.target.value)} required />
                  <datalist id="ai-model-options">{provider.models.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</datalist>
                </>
              )}
            </Field>
            {isCodex ? (
              <Field>
                <FieldLabel>{t("settings.ai.thinkingEffort")}</FieldLabel>
                <Select value={reasoningEffort} onValueChange={setReasoningEffort}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>{reasoningOptions.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}</SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{reasoningOptions.find((item) => item.id === reasoningEffort)?.description || t("settings.ai.thinkingEffortDescription")}</FieldDescription>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="baseUrl">{t("settings.ai.baseUrl")}</FieldLabel>
              <Input id="baseUrl" name="baseUrl" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={provider.baseUrl || "https://api.example.com/v1"} />
            </Field>
            <Field>
              <FieldLabel htmlFor="apiKeyEnvVar">{t("settings.ai.apiKeyEnvVar")}</FieldLabel>
              <Input id="apiKeyEnvVar" name="apiKeyEnvVar" value={apiKeyEnvVar} onChange={(event) => setApiKeyEnvVar(event.target.value)} placeholder={provider.apiKeyEnvVar || "OPTIONAL_API_KEY"} />
            </Field>
            <Field orientation="horizontal" className="sm:col-span-2">
              <Checkbox checked={allowRemote} onCheckedChange={(checked) => setAllowRemote(checked === true)} id="allowRemoteHealthContext" />
              <FieldContent>
                <FieldTitle>{t("settings.ai.allowRemoteTitle")}</FieldTitle>
                <FieldDescription>{t("settings.ai.allowRemoteDescription")}</FieldDescription>
              </FieldContent>
            </Field>
            <Button className="sm:col-span-2 sm:justify-self-end" type="submit">{t("settings.ai.save")}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function DataExport({ controller }: { controller: DashboardController }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.export.title")}</CardTitle>
        <CardDescription>{t("settings.export.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void controller.exportDatabase(String(form.get("exportPassphrase") || ""), String(form.get("confirmExportPassphrase") || ""));
        }}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="exportPassphrase">{t("settings.export.passphrase")}</FieldLabel>
              <Input id="exportPassphrase" name="exportPassphrase" type="password" minLength={12} autoComplete="new-password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmExportPassphrase">{t("settings.export.confirmPassphrase")}</FieldLabel>
              <Input id="confirmExportPassphrase" name="confirmExportPassphrase" type="password" minLength={12} autoComplete="new-password" required />
            </Field>
            <Button type="submit"><Download data-icon="inline-start" />{t("settings.export.submit")}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, name, value, min, max, step }: { label: string; name: string; value: number | null; min: number; max?: number; step: number }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} type="number" min={min} max={max} step={step} defaultValue={value ?? ""} />
    </Field>
  );
}
