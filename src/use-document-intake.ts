import { useRef, useState } from "react";
import { invokeCommand } from "./platform/tauri-client";
import { toast } from "sonner";
import { hasEnabledCodexModel, type AiSettings } from "./ai-sdk-config";
import type { BackgroundJobInput, BackgroundJobPatch, DeveloperLogInput, DocumentAnalysis, ExtractedResult, LlmCallInput, LlmCallPatch, NavKey, PendingDocument } from "./dashboard-model";
import { createEmptyExtractedResult, MAX_DOCUMENT_BYTES, missingExtractedResultFields, parseExtractedResults } from "./document-analysis";
import { pendingDocumentFromFile } from "./document-intake";
import { renderDocumentPages } from "./document-rendering";
import { t } from "./i18n";

type DocumentIntakeOptions = {
  aiSettings: AiSettings;
  databasePath: string;
  selectedOrganKey: string;
  loadDashboard: () => unknown;
  openDocumentDialog: () => void;
  closeDocumentDialog: () => void;
  setSelectedNav: (nav: NavKey) => void;
  onJobStart: (input: BackgroundJobInput) => string;
  onJobUpdate: (jobId: string, patch: BackgroundJobPatch) => void;
  isBackgroundJobCancelled: (jobId: string) => boolean;
  onDeveloperLog: (input: DeveloperLogInput) => void;
  onLlmCallStart: (input: LlmCallInput) => string;
  onLlmCallUpdate: (callId: string, patch: LlmCallPatch) => void;
};

const readyAnalysis = (): DocumentAnalysis => ({ status: "ready", results: [], error: "" });
type DocumentReviewSession = { id: string; document: PendingDocument | null; analysis: DocumentAnalysis };

export function useDocumentIntake(options: DocumentIntakeOptions) {
  const [documentSessions, setDocumentSessions] = useState<DocumentReviewSession[]>([]);
  const [activeDocumentSessionId, setActiveDocumentSessionId] = useState("");
  const pendingDocumentFileRef = useRef(new Map<string, File>());
  const savingRef = useRef(false);
  const activeSession = documentSessions.find((session) => session.id === activeDocumentSessionId) || null;

  function updateSession(sessionId: string, update: (session: DocumentReviewSession) => DocumentReviewSession): void {
    setDocumentSessions((current) => current.map((session) => session.id === sessionId ? update(session) : session));
  }

  function createSession(document: PendingDocument | null, analysis = readyAnalysis()): string {
    const id = newDocumentSessionId();
    setDocumentSessions((current) => [{ id, document, analysis }, ...current]);
    setActiveDocumentSessionId(id);
    return id;
  }

  function closeDocumentReview(): void {
    setActiveDocumentSessionId("");
  }

  function clearDocumentIntake(): void {
    if (!activeDocumentSessionId) return;
    pendingDocumentFileRef.current.delete(activeDocumentSessionId);
    setDocumentSessions((current) => current.filter((session) => session.id !== activeDocumentSessionId));
    setActiveDocumentSessionId("");
  }

  function preparePromptResults(results: ExtractedResult[]): void {
    createSession(null, { status: "ready", results, error: "" });
    options.setSelectedNav("documents");
    options.openDocumentDialog();
  }

  function prepareDocumentResult(file: File): void {
    const result = pendingDocumentFromFile(file);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const sessionId = createSession(result.document);
    pendingDocumentFileRef.current.set(sessionId, file);
    options.setSelectedNav("documents");
    options.openDocumentDialog();
    void analyzeDocumentResult(sessionId, file);
  }

  async function analyzeDocumentResult(sessionId: string, file: File): Promise<void> {
    const jobId = options.onJobStart({
      kind: "document-analysis",
      title: t("jobs.documentAnalysis"),
      description: t("jobs.documentAnalysisDescription", { file: file.name }),
    });
    options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.documentSelected"), detail: file.name });
    if (!hasEnabledCodexModel(options.aiSettings)) {
      const message = t("document.noLlmEnabled");
      updateSession(sessionId, (session) => ({ ...session, analysis: { status: "error", results: [], error: message } }));
      options.onJobUpdate(jobId, { status: "failed", error: message });
      options.onDeveloperLog({ area: "document", level: "error", message: t("developer.log.callSkipped"), detail: message });
      toast.error(message);
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      const message = t("toast.fileTooLarge");
      updateSession(sessionId, (session) => ({ ...session, analysis: { status: "error", results: [], error: message } }));
      options.onJobUpdate(jobId, { status: "failed", error: message });
      toast.error(message);
      return;
    }
    updateSession(sessionId, (session) => ({ ...session, analysis: { status: "analyzing", results: [], error: "" } }));
    let callId = "";
    function stopIfCancelled(): boolean {
      if (!options.isBackgroundJobCancelled(jobId)) return false;
      const message = t("jobs.stopDiscarded");
      updateSession(sessionId, (session) => ({ ...session, analysis: { status: "error", results: [], error: message } }));
      return true;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (stopIfCancelled()) return;
      options.onJobUpdate(jobId, { progress: 20 });
      options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.sourceLoaded"), detail: t("developer.log.bytes", { count: bytes.length }) });
      const renderedPages = await renderDocumentPages(file);
      if (stopIfCancelled()) return;
      options.onJobUpdate(jobId, { progress: 40 });
      options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.pagesRendered"), detail: t("developer.log.pages", { count: renderedPages.length }) });
      callId = options.onLlmCallStart({ kind: "document-analysis", command: "analyze_document", inputLabel: file.name, modelId: options.aiSettings.modelId, reasoningEffort: options.aiSettings.reasoningEffort, promptChars: 0, fileBytes: bytes.length, renderedPages: renderedPages.length });
      options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.callStarted"), detail: t("developer.log.command", { command: "analyze_document" }) });
      const raw = await invokeCommand<string>("analyze_document", { input: { fileName: file.name, fileBytes: Array.from(bytes), renderedPages, modelId: options.aiSettings.modelId, reasoningEffort: options.aiSettings.reasoningEffort } });
      options.onLlmCallUpdate(callId, { status: "completed", outputChars: raw.length });
      options.onDeveloperLog({ area: "document", level: "success", message: t("developer.log.callCompleted"), detail: t("developer.log.chars", { count: raw.length }) });
      if (stopIfCancelled()) return;
      const results = parseExtractedResults(raw);
      if (results.length === 0) {
        const message = t("document.extractError");
        updateSession(sessionId, (session) => ({ ...session, analysis: { status: "error", results: [], error: message } }));
        options.onJobUpdate(jobId, { status: "failed", error: message });
        toast.warning(t("toast.extractManual"));
        return;
      }
      updateSession(sessionId, (session) => ({ ...session, analysis: { status: "ready", results, error: "" } }));
      options.onJobUpdate(jobId, { status: "completed", progress: 100 });
      toast.success(t(results.length === 1 ? "toast.extractedResult" : "toast.extractedResults", { count: results.length }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateSession(sessionId, (session) => ({ ...session, analysis: { status: "error", results: [], error: message } }));
      options.onJobUpdate(jobId, { status: "failed", error: message });
      if (callId) options.onLlmCallUpdate(callId, { status: "failed", error: message });
      options.onDeveloperLog({ area: "document", level: "error", message: t("developer.log.callFailed"), detail: message });
      toast.error(t("toast.documentAnalysisFailed"));
    }
  }

  function updateDocumentResult(id: string, patch: Partial<ExtractedResult>): void {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => ({ ...session, analysis: { ...session.analysis, results: session.analysis.results.map((result) => result.id === id ? { ...result, ...patch } : result) } }));
  }

  function removeDocumentResult(id: string): void {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => ({ ...session, analysis: { ...session.analysis, results: session.analysis.results.filter((result) => result.id !== id) } }));
  }

  function addDocumentResultRow(): void {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => ({ ...session, analysis: { ...session.analysis, results: [...session.analysis.results, createEmptyExtractedResult(options.selectedOrganKey)] } }));
  }

  async function acceptDocumentResults(): Promise<void> {
    if (savingRef.current || !activeSession) return;
    const invalid = activeSession.analysis.results.map((result, index) => ({ fields: missingExtractedResultFields(result), index })).filter((entry) => entry.fields.length > 0);
    if (invalid.length > 0) {
      const first = invalid[0];
      const fields = first.fields.map((field) => field === "marker" ? t("intake.result.marker") : field === "value" ? t("common.value") : field === "measuredAt" ? t("common.date") : t("lab.followUp.label")).join(", ");
      toast.error(t("toast.resolveDocumentFields", { fields, row: first.index + 1 }));
      return;
    }
    const session = activeSession;
    const valid = session.analysis.results;
    savingRef.current = true;
    try {
      const input = { results: valid.map((result) => ({ organKey: result.organKey, marker: result.marker, value: result.value, unit: result.unit, status: result.status || "normal", measuredAt: result.measuredAt, notes: result.notes, referenceRange: result.referenceRange })), report: session.document };
      const file = pendingDocumentFileRef.current.get(session.id);
      if (session.document && file) {
        if (file.size > MAX_DOCUMENT_BYTES) throw new Error(t("toast.fileTooLarge"));
        const bytes = new Uint8Array(await file.arrayBuffer());
        await invokeCommand("import_lab_results_document", { input: { ...input, fileName: file.name, fileBytes: Array.from(bytes), dbPath: options.databasePath } });
      } else {
        await invokeCommand("add_lab_results", { input });
      }
      pendingDocumentFileRef.current.delete(session.id);
      setDocumentSessions((current) => current.filter((entry) => entry.id !== session.id));
      setActiveDocumentSessionId("");
      options.closeDocumentDialog();
      toast.success(t(valid.length === 1 ? "toast.savedResult" : "toast.savedResults", { count: valid.length }));
      await options.loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      savingRef.current = false;
    }
  }

  return {
    documentSessions,
    activeDocumentSessionId,
    setActiveDocumentSessionId,
    pendingDocument: activeSession?.document || null,
    documentAnalysis: activeSession?.analysis || readyAnalysis(),
    clearDocumentIntake,
    closeDocumentReview,
    preparePromptResults,
    prepareDocumentResult,
    updateDocumentResult,
    removeDocumentResult,
    addDocumentResultRow,
    acceptDocumentResults,
  };
}

function newDocumentSessionId(): string {
  return globalThis.crypto?.randomUUID?.() || `document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
