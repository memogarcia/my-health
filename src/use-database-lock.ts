import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { normalizeAiSettings, type AiSettings } from "./ai-sdk-config";
import type { DatabaseStatus } from "./database-gate";
import { normalizeUserState, type DashboardSnapshot, type DialogKey, type HistoryTab, type NavKey, type UserState } from "./dashboard-model";
import { t } from "./i18n";
import type { RegimenDraft } from "./prompt-actions";

type DatabaseLockOptions = {
  databaseStatus: DatabaseStatus | null;
  databaseEpochRef: MutableRefObject<number>;
  clearDocumentIntake: () => void;
  setActiveDialog: Dispatch<SetStateAction<DialogKey>>;
  setActiveHistoryTab: Dispatch<SetStateAction<HistoryTab>>;
  setAiPendingConversationId: Dispatch<SetStateAction<string>>;
  setAiSettings: Dispatch<SetStateAction<AiSettings>>;
  setDatabaseStatus: Dispatch<SetStateAction<DatabaseStatus | null>>;
  setLoadError: Dispatch<SetStateAction<string>>;
  setRegimenDraft: Dispatch<SetStateAction<RegimenDraft | null>>;
  setSelectedNav: (nav: NavKey) => void;
  setSelectedOrganKey: Dispatch<SetStateAction<string>>;
  setSnapshot: Dispatch<SetStateAction<DashboardSnapshot | null>>;
  setUserState: (state: UserState) => void;
};

export function makeDatabaseLockAction(options: DatabaseLockOptions) {
  async function lockDatabase(): Promise<void> {
    if (!options.databaseStatus?.unlocked) return;
    try {
      const status = await invoke<DatabaseStatus>("lock_database");
      options.databaseEpochRef.current += 1;
      options.setDatabaseStatus(status);
      options.setSnapshot(null);
      options.setAiSettings(normalizeAiSettings());
      options.setUserState(normalizeUserState());
      options.setLoadError("");
      options.setSelectedOrganKey("heart");
      options.setSelectedNav("body");
      options.setActiveHistoryTab("labs");
      options.setActiveDialog(null);
      options.setRegimenDraft(null);
      options.clearDocumentIntake();
      options.setAiPendingConversationId("");
      toast.success(t("toast.databaseLocked"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return { lockDatabase };
}
