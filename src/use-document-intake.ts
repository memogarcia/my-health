import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  setSelectedNav: (nav: NavKey) => void;
  onJobStart: (input: BackgroundJobInput) => string;
  onJobUpdate: (jobId: string, patch: BackgroundJobPatch) => void;
  onDeveloperLog: (input: DeveloperLogInput) => void;
  onLlmCallStart: (input: LlmCallInput) => string;
  onLlmCallUpdate: (callId: string, patch: LlmCallPatch) => void;
};

export function useDocumentIntake(options: DocumentIntakeOptions) {
  const [pendingDocument, setPendingDocument] = useState(null as PendingDocument | null);
  const [documentAnalysis, setDocumentAnalysis] = useState({ status: "ready", results: [], error: "" } as DocumentAnalysis);
  const analysisTokenRef = useRef(0);
  const pendingDocumentFileRef = useRef(null as File | null);
  const savingRef = useRef(false);

  function clearDocumentIntake(): void {
    setPendingDocument(null);
    pendingDocumentFileRef.current = null;
    analysisTokenRef.current += 1;
    setDocumentAnalysis({ status: "ready", results: [], error: "" });
  }

  function preparePromptResults(results: ExtractedResult[]): void {
    analysisTokenRef.current += 1;
    setPendingDocument(null);
    pendingDocumentFileRef.current = null;
    setDocumentAnalysis({ status: "ready", results, error: "" });
    options.setSelectedNav("documents");
    options.openDocumentDialog();
  }

  function prepareDocumentResult(file: File): void {
    const result = pendingDocumentFromFile(file);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    pendingDocumentFileRef.current = file;
    setPendingDocument(result.document);
    options.setSelectedNav("documents");
    options.openDocumentDialog();
    void analyzeDocumentResult(file);
  }

  async function analyzeDocumentResult(file: File): Promise<void> {
    const token = (analysisTokenRef.current += 1);
    const jobId = options.onJobStart({
      kind: "document-analysis",
      title: t("jobs.documentAnalysis"),
      description: t("jobs.documentAnalysisDescription", { file: file.name }),
    });
    options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.documentSelected"), detail: file.name });
    if (!hasEnabledCodexModel(options.aiSettings)) {
      const message = t("document.noLlmEnabled");
      setDocumentAnalysis({ status: "error", results: [], error: message });
      options.onJobUpdate(jobId, { status: "failed", error: message });
      options.onDeveloperLog({ area: "document", level: "error", message: t("developer.log.callSkipped"), detail: message });
      toast.error(message);
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      const message = t("toast.fileTooLarge");
      setDocumentAnalysis({ status: "error", results: [], error: message });
      options.onJobUpdate(jobId, { status: "failed", error: message });
      toast.error(message);
      return;
    }
    setDocumentAnalysis({ status: "analyzing", results: [], error: "" });
    let callId = "";
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      options.onJobUpdate(jobId, { progress: 20 });
      options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.sourceLoaded"), detail: t("developer.log.bytes", { count: bytes.length }) });
      const renderedPages = await renderDocumentPages(file);
      options.onJobUpdate(jobId, { progress: 40 });
      options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.pagesRendered"), detail: t("developer.log.pages", { count: renderedPages.length }) });
      callId = options.onLlmCallStart({
        kind: "document-analysis",
        command: "analyze_document",
        inputLabel: file.name,
        modelId: options.aiSettings.modelId,
        reasoningEffort: options.aiSettings.reasoningEffort,
        promptChars: 0,
        fileBytes: bytes.length,
        renderedPages: renderedPages.length,
      });
      options.onDeveloperLog({ area: "document", level: "info", message: t("developer.log.callStarted"), detail: t("developer.log.command", { command: "analyze_document" }) });
      const raw = await invoke<string>("analyze_document", {
        input: {
          fileName: file.name,
          fileBytes: Array.from(bytes),
          renderedPages,
          modelId: options.aiSettings.modelId,
          reasoningEffort: options.aiSettings.reasoningEffort,
        },
      });
      options.onLlmCallUpdate(callId, { status: "completed", outputChars: raw.length });
      options.onDeveloperLog({ area: "document", level: "success", message: t("developer.log.callCompleted"), detail: t("developer.log.chars", { count: raw.length }) });
      if (token !== analysisTokenRef.current) {
        if (callId) options.onLlmCallUpdate(callId, { status: "failed", error: t("jobs.cancelled") });
        options.onJobUpdate(jobId, { status: "failed", error: t("jobs.cancelled") });
        return;
      }
      options.onJobUpdate(jobId, { progress: 80 });
      const results = parseExtractedResults(raw);
      if (results.length === 0) {
        const message = t("document.extractError");
        setDocumentAnalysis({ status: "error", results: [], error: message });
        options.onJobUpdate(jobId, { status: "failed", error: message });
        toast.warning(t("toast.extractManual"));
        return;
      }
      setDocumentAnalysis({ status: "ready", results, error: "" });
      options.onJobUpdate(jobId, { status: "completed", progress: 100 });
      toast.success(t(results.length === 1 ? "toast.extractedResult" : "toast.extractedResults", { count: results.length }));
    } catch (error) {
      if (token !== analysisTokenRef.current) {
        if (callId) options.onLlmCallUpdate(callId, { status: "failed", error: t("jobs.cancelled") });
        options.onJobUpdate(jobId, { status: "failed", error: t("jobs.cancelled") });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      setDocumentAnalysis({ status: "error", results: [], error: message });
      options.onJobUpdate(jobId, { status: "failed", error: message });
      if (callId) options.onLlmCallUpdate(callId, { status: "failed", error: message });
      options.onDeveloperLog({ area: "document", level: "error", message: t("developer.log.callFailed"), detail: message });
      toast.error(t("toast.documentAnalysisFailed"));
    }
  }

  function updateDocumentResult(id: string, patch: Partial<ExtractedResult>): void {
    setDocumentAnalysis((current) => ({
      ...current,
      results: current.results.map((result) => (result.id === id ? { ...result, ...patch } : result)),
    }));
  }

  function removeDocumentResult(id: string): void {
    setDocumentAnalysis((current) => ({
      ...current,
      results: current.results.filter((result) => result.id !== id),
    }));
  }

  function addDocumentResultRow(): void {
    setDocumentAnalysis((current) => ({
      ...current,
      results: [...current.results, createEmptyExtractedResult(options.selectedOrganKey)],
    }));
  }

  async function acceptDocumentResults(): Promise<void> {
    if (savingRef.current) return;
    const invalid = documentAnalysis.results
      .map((result, index) => ({ fields: missingExtractedResultFields(result), index }))
      .filter((entry) => entry.fields.length > 0);
    if (invalid.length > 0) {
      const first = invalid[0];
      const fields = first.fields.map((field) => field === "marker"
        ? t("intake.result.marker")
        : field === "value"
          ? t("common.value")
          : field === "measuredAt"
            ? t("common.date")
            : t("lab.followUp.label")).join(", ");
      toast.error(t("toast.resolveDocumentFields", { fields, row: first.index + 1 }));
      return;
    }
    const valid = documentAnalysis.results;
    savingRef.current = true;
    try {
      const input = {
          results: valid.map((result) => ({
            organKey: result.organKey,
            marker: result.marker,
            value: result.value,
            unit: result.unit,
            status: result.status || "normal",
            measuredAt: result.measuredAt,
            notes: result.notes,
            referenceRange: result.referenceRange,
          })),
          report: pendingDocument,
      };
      const file = pendingDocumentFileRef.current;
      if (pendingDocument && file) {
        if (file.size > MAX_DOCUMENT_BYTES) throw new Error(t("toast.fileTooLarge"));
        const bytes = new Uint8Array(await file.arrayBuffer());
        await invoke("import_lab_results_document", {
          input: { ...input, fileName: file.name, fileBytes: Array.from(bytes), dbPath: options.databasePath },
        });
      } else {
        await invoke("add_lab_results", { input });
      }
      clearDocumentIntake();
      toast.success(t(valid.length === 1 ? "toast.savedResult" : "toast.savedResults", { count: valid.length }));
      await options.loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      savingRef.current = false;
    }
  }

  return {
    pendingDocument,
    documentAnalysis,
    clearDocumentIntake,
    preparePromptResults,
    prepareDocumentResult,
    updateDocumentResult,
    removeDocumentResult,
    addDocumentResultRow,
    acceptDocumentResults,
  };
}
