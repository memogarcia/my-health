import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { hasEnabledCodexModel, type AiSettings } from "./ai-sdk-config";
import type { DocumentAnalysis, ExtractedResult, NavKey, PendingDocument } from "./dashboard-model";
import { createEmptyExtractedResult, MAX_DOCUMENT_BYTES, parseExtractedResults } from "./document-analysis";
import { pendingDocumentFromFile } from "./document-intake";
import { t } from "./i18n";

type DocumentIntakeOptions = {
  aiSettings: AiSettings;
  databasePath: string;
  selectedOrganKey: string;
  loadDashboard: () => unknown;
  openDocumentDialog: () => void;
  setSelectedNav: (nav: NavKey) => void;
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
    if (!hasEnabledCodexModel(options.aiSettings)) {
      const message = t("document.noLlmEnabled");
      setDocumentAnalysis({ status: "error", results: [], error: message });
      toast.error(message);
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      const message = t("toast.fileTooLarge");
      setDocumentAnalysis({ status: "error", results: [], error: message });
      toast.error(message);
      return;
    }
    setDocumentAnalysis({ status: "analyzing", results: [], error: "" });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const raw = await invoke<string>("analyze_document", {
        input: {
          fileName: file.name,
          fileBytes: Array.from(bytes),
          modelId: options.aiSettings.modelId,
          reasoningEffort: options.aiSettings.reasoningEffort,
        },
      });
      if (token !== analysisTokenRef.current) return;
      const results = parseExtractedResults(raw);
      if (results.length === 0) {
        const message = t("document.extractError");
        setDocumentAnalysis({ status: "error", results: [], error: message });
        toast.warning(t("toast.extractManual"));
        return;
      }
      setDocumentAnalysis({ status: "ready", results, error: "" });
      toast.success(t(results.length === 1 ? "toast.extractedResult" : "toast.extractedResults", { count: results.length }));
    } catch (error) {
      if (token !== analysisTokenRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      setDocumentAnalysis({ status: "error", results: [], error: message });
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
    const valid = documentAnalysis.results.filter((result) => result.marker.trim() && result.value.trim() && result.measuredAt && result.status);
    if (valid.length === 0 || valid.length !== documentAnalysis.results.length) {
      toast.error(t("toast.resolveDocumentFields"));
      return;
    }
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
