import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { Dispatch, SetStateAction } from "react";
import type { BiologicalAgeReportInput, ConditionInput, HealthStatus, PendingDocument, RegimenInput } from "./dashboard-model";
import { t } from "./i18n";
import type { RegimenDraft } from "./prompt-actions";

export type ResultInput = {
  organKey: string;
  marker: string;
  value: string;
  unit: string;
  status: HealthStatus;
  measuredAt: string;
  notes: string;
  referenceRange: string;
  report?: PendingDocument;
};

export type SymptomInput = {
  organKey: string;
  name: string;
  severity: number;
  observedAt: string;
  notes: string;
};

type RecordActionOptions = {
  closeDialog: () => void;
  loadDashboard: () => Promise<boolean>;
  setRegimenDraft: Dispatch<SetStateAction<RegimenDraft | null>>;
};

export function makeRecordActions(options: RecordActionOptions) {
  async function addLabResult(input: ResultInput, isDocumentResult = false): Promise<void> {
    try {
      await invoke("add_lab_result", { input });
      options.closeDialog();
      toast.success(isDocumentResult ? t("toast.documentResultSaved") : t("toast.resultSaved"));
      await options.loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateLabResult(input: ResultInput & { id: number }): Promise<boolean> {
    return mutate("update_lab_result", { input }, t("toast.resultUpdated"), options.loadDashboard);
  }

  async function deleteLabResult(id: number): Promise<boolean> {
    return mutate("delete_lab_result", { id }, t("toast.resultDeleted"), options.loadDashboard);
  }

  async function addSymptom(input: SymptomInput): Promise<void> {
    try {
      await invoke("add_symptom", { input });
      options.closeDialog();
      toast.success(t("toast.symptomSaved"));
      await options.loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateSymptom(input: SymptomInput & { id: number }): Promise<boolean> {
    return mutate("update_symptom", { input }, t("toast.symptomUpdated"), options.loadDashboard);
  }

  async function deleteSymptom(id: number): Promise<boolean> {
    return mutate("delete_symptom", { id }, t("toast.symptomDeleted"), options.loadDashboard);
  }

  async function addCondition(input: ConditionInput): Promise<boolean> {
    return mutate("add_condition", { input }, t("toast.conditionSaved"), options.loadDashboard);
  }

  async function updateCondition(input: ConditionInput & { id: number }): Promise<boolean> {
    return mutate("update_condition", { input }, t("toast.conditionUpdated"), options.loadDashboard);
  }

  async function deleteCondition(id: number): Promise<boolean> {
    return mutate("delete_condition", { id }, t("toast.conditionDeleted"), options.loadDashboard);
  }

  async function addRegimenItem(input: RegimenInput): Promise<boolean> {
    const saved = await mutate("add_regimen_item", { input }, input.kind === "medication" ? t("toast.medicationSaved") : t("toast.supplementSaved"), options.loadDashboard);
    if (saved) options.setRegimenDraft(null);
    return saved;
  }

  async function updateRegimenItem(input: RegimenInput & { id: number }): Promise<boolean> {
    return mutate("update_regimen_item", { input }, t("toast.regimenUpdated"), options.loadDashboard);
  }

  async function deleteRegimenItem(id: number): Promise<boolean> {
    return mutate("delete_regimen_item", { id }, t("toast.regimenDeleted"), options.loadDashboard);
  }

  async function setRegimenItemActive(id: number, active: boolean): Promise<boolean> {
    return mutate(active ? "reactivate_regimen_item" : "stop_regimen_item", { id }, active ? t("toast.regimenReactivated") : t("toast.regimenStopped"), options.loadDashboard);
  }

  async function addBiologicalAgeReport(input: BiologicalAgeReportInput): Promise<boolean> {
    return mutate("add_biological_age_report", { input }, t("toast.biologicalAgeSaved"), options.loadDashboard);
  }

  async function updateBiologicalAgeReport(input: BiologicalAgeReportInput & { id: number }): Promise<boolean> {
    return mutate("update_biological_age_report", { input }, t("toast.biologicalAgeUpdated"), options.loadDashboard);
  }

  async function deleteBiologicalAgeReport(id: number): Promise<boolean> {
    return mutate("delete_biological_age_report", { id }, t("toast.biologicalAgeDeleted"), options.loadDashboard);
  }

  async function unlinkLabReport(id: number): Promise<boolean> {
    return mutate("unlink_lab_report", { id }, t("toast.reportUnlinked"), options.loadDashboard);
  }

  async function deleteLabReport(id: number, deleteResults: boolean): Promise<boolean> {
    return mutate("delete_lab_report", { input: { id, deleteResults } }, deleteResults ? t("toast.reportDeletedWithResults") : t("toast.reportDeleted"), options.loadDashboard);
  }

  return {
    addLabResult,
    updateLabResult,
    deleteLabResult,
    addSymptom,
    updateSymptom,
    deleteSymptom,
    addCondition,
    updateCondition,
    deleteCondition,
    addRegimenItem,
    updateRegimenItem,
    deleteRegimenItem,
    setRegimenItemActive,
    addBiologicalAgeReport,
    updateBiologicalAgeReport,
    deleteBiologicalAgeReport,
    unlinkLabReport,
    deleteLabReport,
  };
}

async function mutate(command: string, args: Record<string, unknown>, successMessage: string, loadDashboard: () => Promise<boolean>): Promise<boolean> {
  try {
    await invoke(command, args);
    toast.success(successMessage);
    const refreshed = await loadDashboard();
    if (!refreshed) toast.warning(t("toast.refreshFailed"));
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}
