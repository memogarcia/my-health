import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { getAiProvider, isAiProviderLive, normalizeAiSettings, type AiSettings, type CodexModelOption } from "./ai-sdk-config";
import { summarizeAppleHealthFile } from "./apple-health-import";
import { type DatabaseStatus } from "./database-gate";
import { newLocalDatabasePath, pickExistingDatabase } from "./database-picker";
import {
  buildDisplaySnapshot,
  normalizeUserState,
  type DashboardSnapshot,
  type DialogKey,
  type HistoryTab,
  type NavKey,
  type OrganSummary,
  type UserState,
} from "./dashboard-model";
import { t } from "./i18n";
import { makePromptActions, type RegimenDraft } from "./prompt-actions";
import { makeRecordActions, type ResultInput, type SymptomInput } from "./use-dashboard-record-actions";
import { isTauriRuntime, TAURI_ONLY_MESSAGE } from "./tauri-runtime";
import { activityFromForm, aiSettingsFromForm, profileFromForm } from "./user-state";
import { useDocumentIntake } from "./use-document-intake";

export type { ResultInput, SymptomInput };

type DialogName = Exclude<DialogKey, null>;

export function useDashboardController() {
  const [snapshot, setSnapshot] = useState(null as DashboardSnapshot | null);
  const [selectedOrganKey, setSelectedOrganKey] = useState("heart");
  const [selectedNav, setSelectedNavState] = useState("body" as NavKey);
  const [activeHistoryTab, setActiveHistoryTab] = useState("labs" as HistoryTab);
  const [activeDialog, setActiveDialog] = useState(null as DialogKey);
  const [aiSettings, setAiSettings] = useState(normalizeAiSettings());
  const [userState, setUserState] = useState(normalizeUserState());
  const [loadError, setLoadError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [tauriRuntimeAvailable] = useState(isTauriRuntime);
  const [regimenDraft, setRegimenDraft] = useState(null as RegimenDraft | null);
  const [databaseStatus, setDatabaseStatus] = useState(null as DatabaseStatus | null);
  const [aiPendingConversationId, setAiPendingConversationId] = useState("");
  const [codexModels, setCodexModels] = useState<CodexModelOption[]>([]);
  const [codexOptionsError, setCodexOptionsError] = useState("");

  const display = useMemo(() => buildDisplaySnapshot(snapshot), [snapshot]);
  const selectedOrgan = useMemo(
    () => display.organs.find((organ) => organ.key === selectedOrganKey) || display.organs[0],
    [display.organs, selectedOrganKey],
  );
  const organLabs = useMemo(
    () => display.latestLabResults.filter((lab) => lab.organKey === selectedOrgan.key),
    [display.latestLabResults, selectedOrgan.key],
  );
  const organSymptoms = useMemo(
    () => display.recentSymptoms.filter((symptom) => symptom.organKey === selectedOrgan.key),
    [display.recentSymptoms, selectedOrgan.key],
  );
  const organConditions = useMemo(
    () => display.conditions.filter((condition) => condition.organKey === selectedOrgan.key),
    [display.conditions, selectedOrgan.key],
  );
  const attentionMarkers = display.latestLabResults.filter((lab) => lab.status === "attention").length;
  const monitorMarkers = display.latestLabResults.filter((lab) => lab.status === "monitor").length;
  const attentionOrgans: Array<{ key: string; name: string; status: OrganSummary["status"] }> = display.organs
    .filter((organ) => organ.status === "attention" || organ.status === "monitor")
    .slice(0, 4)
    .map((organ) => ({ key: organ.key, name: organ.name, status: organ.status }));

  function setSelectedNav(nav: NavKey): void {
    setSelectedNavState(nav);
    if (nav === "labs" || nav === "symptoms") setActiveHistoryTab(nav);
    if (nav === "documents") setActiveHistoryTab("files");
  }

  const documentIntake = useDocumentIntake({
    aiSettings,
    selectedOrganKey,
    loadDashboard,
    setSelectedNav,
    openDocumentDialog: () => setActiveDialog("document"),
  });

  function openDialog(key: DialogName): void {
    setActiveDialog(key);
  }

  function closeDialog(): void {
    setActiveDialog(null);
    documentIntake.clearDocumentIntake();
  }

  async function persistAiSettings(next: AiSettings): Promise<boolean> {
    try {
      await invoke("save_ai_settings", { settings: JSON.stringify(next) });
      return true;
    } catch (error) {
      const message = String(error || "");
      if (message.includes("API key")) {
        toast.error(message);
      } else {
        toast.warning(t("toast.aiSettingsSession"));
      }
      return false;
    }
  }

  async function persistUserState(next: UserState): Promise<void> {
    try {
      await invoke("save_user_state", { state: JSON.stringify(next) });
    } catch {
      toast.warning(t("toast.changesSession"));
    }
  }

  async function loadDashboard(currentDatabaseStatus = databaseStatus): Promise<void> {
    try {
      const nextSnapshot = await invoke<DashboardSnapshot>("get_dashboard_snapshot");
      setSnapshot(nextSnapshot);
      setSelectedOrganKey((current) =>
        nextSnapshot.organs.some((organ) => organ.key === current) ? current : nextSnapshot.organs[0]?.key || "heart",
      );
      setLoadError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSnapshot(null);
      setLoadError(currentDatabaseStatus ? message : TAURI_ONLY_MESSAGE);
    }
    setHasLoadedOnce(true);
  }

  useEffect(() => {
    let alive = true;
    async function loadApp(): Promise<void> {
      if (!tauriRuntimeAvailable) {
        setLoadError(TAURI_ONLY_MESSAGE);
        setHasLoadedOnce(true);
        return;
      }
      let status: DatabaseStatus | null = null;
      try {
        status = await invoke<DatabaseStatus>("get_database_status");
        if (!alive) return;
        setDatabaseStatus(status);
        setHasLoadedOnce(true);
      } catch {
        if (!alive) return;
        setDatabaseStatus(null);
      }
      if (status && !status.unlocked) return;

      try {
        const settings = await invoke<string>("get_ai_settings");
        if (alive) setAiSettings(normalizeAiSettings(JSON.parse(settings)));
      } catch {
        if (alive) setAiSettings(normalizeAiSettings());
      }
      try {
        const state = await invoke<string>("get_user_state");
        if (alive) setUserState(normalizeUserState(JSON.parse(state)));
      } catch {
        if (alive) setUserState(normalizeUserState());
      }
      if (alive) await loadDashboard(status);
    }
    void loadApp();
    return () => {
      alive = false;
    };
  }, [tauriRuntimeAvailable]);

  useEffect(() => {
    if (aiSettings.providerId === "codex") void loadCodexOptions();
  }, [aiSettings.providerId]);

  async function loadCodexOptions(): Promise<void> {
    try {
      const result = await invoke<{ models: CodexModelOption[] }>("get_codex_options");
      setCodexModels(result.models || []);
      setCodexOptionsError("");
    } catch {
      setCodexModels([]);
      setCodexOptionsError(t("settings.ai.codexModelsUnavailable"));
    }
  }

  async function unlockDatabase(form: FormData): Promise<void> {
    const passphrase = String(form.get("passphrase") || "");
    const confirmPassphrase = String(form.get("confirmPassphrase") || "");
    const previousState = databaseStatus?.state;
    if (confirmPassphrase && passphrase !== confirmPassphrase) {
      setLoadError(t("toast.passphrasesMismatch"));
      return;
    }
    try {
      const status = await invoke<DatabaseStatus>("unlock_database", { passphrase });
      setDatabaseStatus(status);
      setLoadError("");
      toast.success(previousState === "locked" ? t("toast.databaseUnlocked") : t("toast.encryptedDatabaseReady"));
      const settings = await invoke<string>("get_ai_settings").catch(() => "");
      const state = await invoke<string>("get_user_state").catch(() => "");
      setAiSettings(settings ? normalizeAiSettings(JSON.parse(settings)) : normalizeAiSettings());
      setUserState(state ? normalizeUserState(JSON.parse(state)) : normalizeUserState());
      await loadDashboard(status);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  async function selectDatabasePath(path: string): Promise<void> {
    try {
      const status = await invoke<DatabaseStatus>("select_database", { path });
      setDatabaseStatus(status);
      setSnapshot(null);
      setAiSettings(normalizeAiSettings());
      setUserState(normalizeUserState());
      setLoadError("");
      setSelectedOrganKey("heart");
      setSelectedNav("body");
      setActiveHistoryTab("labs");
      setActiveDialog(null);
      setRegimenDraft(null);
      documentIntake.clearDocumentIntake();
      setAiPendingConversationId("");
      toast.info(status.state === "needsSetup" ? t("toast.newDatabaseSelected") : t("toast.databaseSelected"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  async function openDatabaseFile(): Promise<void> {
    const path = await pickExistingDatabase(databaseStatus?.dbPath);
    if (path) await selectDatabasePath(path);
  }

  async function newDatabaseFile(): Promise<void> {
    try {
      const path = await newLocalDatabasePath();
      if (path) await selectDatabasePath(path);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveProfile(form: FormData): Promise<void> {
    const next = normalizeUserState({ ...userState, profile: profileFromForm(form) });
    setUserState(next);
    setSelectedNav("settings");
    toast.success(t("toast.profileSaved"));
    await persistUserState(next);
  }

  async function saveAiSettings(form: FormData): Promise<void> {
    try {
      const next = aiSettingsFromForm(form);
      setAiSettings(next);
      setSelectedNav("settings");
      if (await persistAiSettings(next)) toast.success(t("toast.aiSettingsSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateAiProvider(providerId: string, navAfterChange: NavKey): Promise<void> {
    const provider = getAiProvider(providerId);
    if (navAfterChange === "plan" && !isAiProviderLive(provider.id)) {
      toast.warning(t("toast.providerPlanned", { provider: provider.label }));
      return;
    }
    const next = normalizeAiSettings({
      providerId: provider.id,
      modelId: provider.models[0]?.id || "",
      baseUrl: provider.baseUrl,
      apiKeyEnvVar: provider.apiKeyEnvVar,
    });
    setAiSettings(next);
    setSelectedNav(navAfterChange);
    if (provider.id === "codex") void loadCodexOptions();
    if (await persistAiSettings(next)) toast.success(t("toast.providerSwitched", { provider: provider.label }));
  }


  async function addActivity(form: FormData): Promise<void> {
    const entry = activityFromForm(form);
    const next = normalizeUserState({ ...userState, activityEntries: [entry, ...userState.activityEntries].slice(0, 50) });
    setUserState(next);
    closeDialog();
    toast.success(t("toast.dailyLogSaved"));
    await persistUserState(next);
  }

  async function importAppleHealthFile(file: File): Promise<void> {
    try {
      const summary = await summarizeAppleHealthFile(file);
      const next = normalizeUserState({
        ...userState,
        appleHealthImports: [summary, ...userState.appleHealthImports].slice(0, 10),
      });
      setUserState(next);
      toast.success(t("toast.appleHealthSaved", { count: summary.recordCount }));
      await persistUserState(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }


  async function exportDatabase(passphrase: string, confirmPassphrase: string): Promise<void> {
    if (passphrase !== confirmPassphrase) {
      toast.error(t("toast.exportPassphrasesMismatch"));
      return;
    }
    try {
      const path = await invoke<string>("export_database", { passphrase });
      setLoadError("");
      toast.success(t("toast.exportSaved", { path }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  const recordActions = makeRecordActions({
    closeDialog,
    loadDashboard,
    setRegimenDraft,
  });

  const promptActions = makePromptActions({
    aiPendingConversationId,
    aiSettings,
    documentIntake,
    persistUserState,
    selectedOrganKey,
    setAiPendingConversationId,
    setRegimenDraft,
    setSelectedNav,
    setUserState,
    userState,
  });

  return {
    snapshot,
    display,
    selectedOrgan,
    organLabs,
    organSymptoms,
    organConditions,
    selectedOrganKey,
    selectedNav,
    activeHistoryTab,
    activeDialog,
    aiSettings,
    userState,
    loadError,
    hasLoadedOnce,
    hasSnapshot: Boolean(snapshot),
    tauriUnavailable: !tauriRuntimeAvailable,
    pendingDocument: documentIntake.pendingDocument,
    documentAnalysis: documentIntake.documentAnalysis,
    regimenDraft,
    databaseStatus,
    aiPendingConversationId,
    codexModels,
    codexOptionsError,
    attentionMarkers,
    monitorMarkers,
    attentionOrgans,
    latestDate: display.latestLabResults[0]?.measuredAt || "",
    setSelectedOrganKey,
    setSelectedNav,
    setActiveHistoryTab,
    openDialog,
    closeDialog,
    openDatabaseFile,
    newDatabaseFile,
    unlockDatabase,
    saveProfile,
    saveAiSettings,
    updateAiProvider,
    loadCodexOptions,
    ...recordActions,
    addActivity,
    importAppleHealthFile,
    prepareDocumentResult: documentIntake.prepareDocumentResult,
    updateDocumentResult: documentIntake.updateDocumentResult,
    removeDocumentResult: documentIntake.removeDocumentResult,
    addDocumentResultRow: documentIntake.addDocumentResultRow,
    acceptDocumentResults: documentIntake.acceptDocumentResults,
    exportDatabase,
    startAiConversation: promptActions.startAiConversation,
    selectAiConversation: promptActions.selectAiConversation,
    submitAiPrompt: promptActions.submitAiPrompt,
    clearRegimenDraft: () => setRegimenDraft(null),
  };
}

export type DashboardController = ReturnType<typeof useDashboardController>;
