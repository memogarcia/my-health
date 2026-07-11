import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { invokeCommand } from "./platform/tauri-client";
import { toast } from "sonner";
import { normalizeAiSettings, type AiSettings, type CodexModelOption } from "./ai-sdk-config";
import { summarizeAppleHealthFile } from "./apple-health-import";
import { type DatabaseStatus } from "./database-gate";
import { isDatabasePassphraseLongEnough, normalizeDatabasePassphrase } from "./database-passphrase";
import { newLocalDatabasePath, pickExistingDatabase } from "./platform/database-picker";
import {
  buildDisplaySnapshot,
  normalizeUserState,
  type ActivityEntry,
  type BackgroundJob,
  type BackgroundJobInput,
  type BackgroundJobPatch,
  type DashboardSnapshot,
  type DialogKey,
  type HistoryTab,
  type NavKey,
  type OrganSummary,
  type UserState,
} from "./dashboard-model";
import { t } from "./i18n";
import { makePromptActions, type RegimenDraft } from "./prompt-actions";
import { makeRecordActions, type BulkResultUpdateInput, type ResultInput, type SymptomInput } from "./use-dashboard-record-actions";
import { isTauriRuntime, TAURI_ONLY_MESSAGE } from "./tauri-runtime";
import { aiSettingsFromForm, profileFromForm, restoreUserState } from "./user-state";
import { useDocumentIntake } from "./use-document-intake";
import { makeDeveloperDiagnostics } from "./use-developer-diagnostics";
import { makeBodyNoteActions, type BodyNoteDraft } from "./use-body-notes";
import { makeFastingActions } from "./use-fasting-actions";
import { makeDatabaseLockAction } from "./use-database-lock";
import { makeUserStateActions } from "./use-user-state-actions";
export type { BulkResultUpdateInput, ResultInput, SymptomInput };
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
  const [bodyNoteDraft, setBodyNoteDraft] = useState(null as BodyNoteDraft | null);
  const [activityDraft, setActivityDraft] = useState(null as ActivityEntry | null);
  const [databaseStatus, setDatabaseStatus] = useState(null as DatabaseStatus | null);
  const [aiPendingConversationId, setAiPendingConversationId] = useState("");
  const [codexModels, setCodexModels] = useState<CodexModelOption[]>([]);
  const [codexOptionsError, setCodexOptionsError] = useState("");
  const databasePathRef = useRef("");
  const databaseEpochRef = useRef(0);
  const userStateRef = useRef(userState);
  const userStateSaveQueueRef = useRef(Promise.resolve());
  const cancelledJobIdsRef = useRef(new Set<string>());
  function setUserStateWithRef(next: SetStateAction<UserState>): void {
    const resolved = typeof next === "function" ? next(userStateRef.current) : next;
    userStateRef.current = resolved;
    setUserState(resolved);
  }
  function startBackgroundJob(input: BackgroundJobInput): string {
    const job: BackgroundJob = {
      id: newBackgroundJobId(),
      kind: input.kind,
      title: input.title,
      description: input.description,
      status: "running",
      progress: null,
      createdAt: new Date().toISOString(),
      finishedAt: "",
      error: "",
    };
    const next = normalizeUserState({
      ...userStateRef.current,
      backgroundJobs: [job, ...userStateRef.current.backgroundJobs].slice(0, 24),
    });
    setUserStateWithRef(next);
    void persistUserState(next);
    cancelledJobIdsRef.current.delete(job.id);
    return job.id;
  }
  function updateBackgroundJob(jobId: string, patch: BackgroundJobPatch): void {
    if (cancelledJobIdsRef.current.has(jobId) && patch.status !== "cancelled") return;
    const current = userStateRef.current;
    if (!current.backgroundJobs.some((job) => job.id === jobId)) return;
    const next = normalizeUserState({
      ...current,
      backgroundJobs: current.backgroundJobs.map((job) => job.id !== jobId ? job : {
        ...job,
        ...patch,
        finishedAt: patch.status && patch.status !== "running" ? new Date().toISOString() : job.finishedAt,
      }),
    });
    setUserStateWithRef(next);
    void persistUserState(next);
  }
  function cancelBackgroundJob(jobId: string): void {
    const job = userStateRef.current.backgroundJobs.find((entry) => entry.id === jobId);
    if (!job || job.status !== "running") return;
    cancelledJobIdsRef.current.add(jobId);
    updateBackgroundJob(jobId, { status: "cancelled", progress: null, error: t("jobs.stopDiscarded") });
  }
  function clearFinishedBackgroundJobs(): void {
    const next = normalizeUserState({
      ...userStateRef.current,
      backgroundJobs: userStateRef.current.backgroundJobs.filter((job) => job.status === "running"),
    });
    setUserStateWithRef(next);
    void persistUserState(next);
  }
  useEffect(() => {
    userStateRef.current = userState;
  }, [userState]);
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
  const latestDate = useMemo(() => [
    ...display.latestLabResults.map((lab) => lab.measuredAt),
    ...display.recentSymptoms.map((symptom) => symptom.observedAt),
    ...display.conditions.map((condition) => condition.diagnosedAt),
  ].filter(Boolean).sort().at(-1) || "", [display.conditions, display.latestLabResults, display.recentSymptoms]);
  function setSelectedNav(nav: NavKey): void {
    setSelectedNavState(nav);
    if (nav === "labs" || nav === "symptoms") setActiveHistoryTab(nav);
    if (nav === "documents") setActiveHistoryTab("files");
  }
  const { clearDeveloperData, recordDeveloperLog, startLlmCall, updateLlmCall } = makeDeveloperDiagnostics({ getUserState: () => userStateRef.current, setUserState: setUserStateWithRef, persistUserState });
  const documentIntake = useDocumentIntake({
    aiSettings,
    databasePath: databaseStatus?.dbPath || "",
    selectedOrganKey,
    loadDashboard,
    setSelectedNav,
    openDocumentDialog: () => setActiveDialog("document"),
    closeDocumentDialog: () => setActiveDialog(null),
    onJobStart: startBackgroundJob,
    onJobUpdate: updateBackgroundJob, isBackgroundJobCancelled: (jobId) => cancelledJobIdsRef.current.has(jobId), onDeveloperLog: recordDeveloperLog, onLlmCallStart: startLlmCall, onLlmCallUpdate: updateLlmCall,
  });
  const { lockDatabase } = makeDatabaseLockAction({ databaseStatus, databaseEpochRef, clearDocumentIntake: documentIntake.clearDocumentIntake, setActiveDialog, setActiveHistoryTab, setAiPendingConversationId, setAiSettings, setDatabaseStatus, setLoadError, setRegimenDraft, setSelectedNav, setSelectedOrganKey, setSnapshot, setUserState: setUserStateWithRef });
  function openDialog(key: DialogName): void {
    if (key === "activity") setActivityDraft(null);
    setActiveDialog(key);
  }
  function closeDialog(): void {
    setActiveDialog(null);
    setBodyNoteDraft(null);
    setActivityDraft(null);
    documentIntake.closeDocumentReview();
  }

  async function persistAiSettings(next: AiSettings): Promise<boolean> {
    const dbPath = databasePathRef.current;
    if (!dbPath) return false;
    try {
      await invokeCommand("save_ai_settings", { settings: JSON.stringify(next), dbPath });
      return databasePathRef.current === dbPath;
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

  async function persistUserState(next: UserState): Promise<boolean> {
    const dbPath = databasePathRef.current;
    if (!dbPath) return false;
    const save = userStateSaveQueueRef.current.then(async () => {
      try {
        await invokeCommand("save_user_state", { state: JSON.stringify(next), dbPath });
        return databasePathRef.current === dbPath;
      } catch {
        toast.warning(t("toast.changesSession"));
        return false;
      }
    });
    userStateSaveQueueRef.current = save.then(() => undefined);
    return save;
  }

  async function loadDashboard(currentDatabaseStatus = databaseStatus): Promise<boolean> {
    try {
      const nextSnapshot = await invokeCommand<DashboardSnapshot>("get_dashboard_snapshot");
      if (databasePathRef.current && nextSnapshot.dbPath !== databasePathRef.current) return false;
      setSnapshot(nextSnapshot);
      setSelectedOrganKey((current) =>
        nextSnapshot.organs.some((organ) => organ.key === current) ? current : nextSnapshot.organs[0]?.key || "heart",
      );
      setLoadError("");
      setHasLoadedOnce(true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(currentDatabaseStatus ? message : TAURI_ONLY_MESSAGE);
      setHasLoadedOnce(true);
      return false;
    }
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
        status = await invokeCommand<DatabaseStatus>("get_database_status");
        if (!alive) return;
        setDatabaseStatus(status);
        databasePathRef.current = status.dbPath;
        setHasLoadedOnce(true);
      } catch {
        if (!alive) return;
        setDatabaseStatus(null);
      }
      if (status && !status.unlocked) return;

      try {
        const settings = await invokeCommand<string>("get_ai_settings");
        if (alive) setAiSettings(normalizeAiSettings(JSON.parse(settings)));
      } catch {
        if (alive) setAiSettings(normalizeAiSettings());
      }
      try {
        const state = await invokeCommand<string>("get_user_state");
        if (alive) setUserStateWithRef(restoreUserState(JSON.parse(state)));
      } catch {
        if (alive) setUserStateWithRef(normalizeUserState());
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
      const result = await invokeCommand<{ models: CodexModelOption[] }>("get_codex_options");
      setCodexModels(result.models || []);
      setCodexOptionsError("");
    } catch {
      setCodexModels([]);
      setCodexOptionsError(t("settings.ai.codexModelsUnavailable"));
    }
  }

  async function unlockDatabase(form: FormData): Promise<void> {
    const passphrase = normalizeDatabasePassphrase(String(form.get("passphrase") || ""));
    const confirmPassphrase = normalizeDatabasePassphrase(String(form.get("confirmPassphrase") || ""));
    const previousState = databaseStatus?.state;
    if (!isDatabasePassphraseLongEnough(passphrase)) {
      setLoadError(t("gate.passphraseTooShort"));
      return;
    }
    if (confirmPassphrase && passphrase !== confirmPassphrase) {
      setLoadError(t("toast.passphrasesMismatch"));
      return;
    }
    try {
      const status = await invokeCommand<DatabaseStatus>("unlock_database", { passphrase });
      setDatabaseStatus(status);
      databasePathRef.current = status.dbPath;
      setLoadError("");
      toast.success(previousState === "locked" ? t("toast.databaseUnlocked") : t("toast.encryptedDatabaseReady"));
      const settings = await invokeCommand<string>("get_ai_settings").catch(() => "");
      const state = await invokeCommand<string>("get_user_state").catch(() => "");
      setAiSettings(settings ? normalizeAiSettings(JSON.parse(settings)) : normalizeAiSettings());
      setUserStateWithRef(state ? restoreUserState(JSON.parse(state)) : normalizeUserState());
      await loadDashboard(status);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  async function selectDatabasePath(path: string): Promise<void> {
    try {
      const status = await invokeCommand<DatabaseStatus>("select_database", { path });
      databasePathRef.current = status.dbPath;
      databaseEpochRef.current += 1;
      setDatabaseStatus(status);
      setSnapshot(null);
      setAiSettings(normalizeAiSettings());
      setUserStateWithRef(normalizeUserState());
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
    setUserStateWithRef(next);
    setSelectedNav("settings");
    if (await persistUserState(next)) toast.success(t("toast.profileSaved"));
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

  async function importAppleHealthFile(file: File): Promise<void> {
    const epoch = databaseEpochRef.current;
    try {
      const summary = await summarizeAppleHealthFile(file);
      if (epoch !== databaseEpochRef.current) return;
      const next = normalizeUserState({
        ...userState,
        appleHealthImports: [summary, ...userState.appleHealthImports],
      });
      setUserStateWithRef(next);
      if (await persistUserState(next)) toast.success(t("toast.appleHealthSaved", { count: summary.recordCount }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  async function exportDatabase(passphrase: string, confirmPassphrase: string): Promise<void> {
    const normalizedPassphrase = normalizeDatabasePassphrase(passphrase);
    const normalizedConfirmation = normalizeDatabasePassphrase(confirmPassphrase);
    if (!isDatabasePassphraseLongEnough(normalizedPassphrase)) {
      toast.error(t("settings.export.passphraseTooShort"));
      return;
    }
    if (normalizedPassphrase !== normalizedConfirmation) {
      toast.error(t("toast.exportPassphrasesMismatch"));
      return;
    }
    try {
      const path = await invokeCommand<string>("export_database", { passphrase: normalizedPassphrase });
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
  const bodyNoteActions = makeBodyNoteActions({ draft: bodyNoteDraft, setDraft: setBodyNoteDraft, setActiveDialog, getUserState: () => userStateRef.current, setUserState: setUserStateWithRef, persistUserState });
  const fastingActions = makeFastingActions({ getUserState: () => userStateRef.current, setUserState: setUserStateWithRef, persistUserState });
  const userStateActions = makeUserStateActions({ activityDraft, getUserState: () => userStateRef.current, persistUserState, setActiveDialog, setActivityDraft, setUserState: setUserStateWithRef });
  const promptActions = makePromptActions({
    aiPendingConversationId,
    aiSettings,
    documentIntake,
    persistUserState,
    selectedOrganKey,
    setAiPendingConversationId,
    setRegimenDraft,
    setSelectedNav,
    setUserState: setUserStateWithRef,
    userState,
    databaseEpoch: databaseEpochRef.current, display,
    isDatabaseCurrent: (epoch) => databaseEpochRef.current === epoch,
    getUserState: () => userStateRef.current,
    onJobStart: startBackgroundJob,
    onJobUpdate: updateBackgroundJob, isBackgroundJobCancelled: (jobId) => cancelledJobIdsRef.current.has(jobId), onDeveloperLog: recordDeveloperLog, onLlmCallStart: startLlmCall, onLlmCallUpdate: updateLlmCall,
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
    documentSessions: documentIntake.documentSessions,
    activeDocumentSessionId: documentIntake.activeDocumentSessionId,
    regimenDraft,
    bodyNoteDraft,
    activityDraft,
    databaseStatus,
    aiPendingConversationId,
    backgroundJobs: userState.backgroundJobs,
    activeBackgroundJobCount: userState.backgroundJobs.filter((job) => job.status === "running").length,
    developerLogs: userState.developerLogs, llmCalls: userState.llmCalls,
    codexModels,
    codexOptionsError,
    attentionMarkers,
    monitorMarkers,
    attentionOrgans,
    latestDate,
    setSelectedOrganKey,
    setSelectedNav,
    setActiveHistoryTab,
    openDialog,
    closeDialog,
    openDatabaseFile,
    newDatabaseFile,
    lockDatabase,
    unlockDatabase,
    saveProfile,
    saveAiSettings,
    loadCodexOptions,
    ...recordActions,
    ...userStateActions,
    ...fastingActions,
    ...bodyNoteActions,
    importAppleHealthFile,
    prepareDocumentResult: documentIntake.prepareDocumentResult,
    setActiveDocumentSessionId: documentIntake.setActiveDocumentSessionId,
    updateDocumentResult: documentIntake.updateDocumentResult,
    removeDocumentResult: documentIntake.removeDocumentResult,
    addDocumentResultRow: documentIntake.addDocumentResultRow,
    acceptDocumentResults: documentIntake.acceptDocumentResults,
    exportDatabase,
    cancelBackgroundJob, clearFinishedBackgroundJobs, clearDeveloperData,
    startAiConversation: promptActions.startAiConversation,
    selectAiConversation: promptActions.selectAiConversation,
    renameAiConversation: promptActions.renameAiConversation,
    deleteAiConversation: promptActions.deleteAiConversation,
    submitAiPrompt: promptActions.submitAiPrompt,
    clearRegimenDraft: () => setRegimenDraft(null),
  };
}

export type DashboardController = ReturnType<typeof useDashboardController>;

function newBackgroundJobId(): string {
  return globalThis.crypto?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
