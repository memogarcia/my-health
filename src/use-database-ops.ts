import { toast } from "sonner";
import { summarizeAppleHealthFile } from "./apple-health-import";
import { normalizeUserState, type UserState } from "./dashboard-model";
import { isDatabasePassphraseLongEnough, normalizeDatabasePassphrase } from "./database-passphrase";
import { t } from "./i18n";
import { invokeCommand } from "./platform/tauri-client";

type Options = {
  databaseEpochRef: { current: number };
  getUserState: () => UserState;
  setUserState: (state: UserState) => void;
  persistUserState: (state: UserState) => Promise<boolean>;
  setLoadError: (error: string) => void;
};

export function makeDatabaseOps({ databaseEpochRef, getUserState, setUserState, persistUserState, setLoadError }: Options) {
  async function importAppleHealthFile(file: File): Promise<void> {
    const epoch = databaseEpochRef.current;
    try {
      const summary = await summarizeAppleHealthFile(file);
      if (epoch !== databaseEpochRef.current) return;
      const current = getUserState();
      const next = normalizeUserState({
        ...current,
        appleHealthImports: [summary, ...current.appleHealthImports],
      });
      setUserState(next);
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

  async function changeDatabasePassword(form: FormData): Promise<void> {
    const currentPassphrase = String(form.get("currentPassphrase") || "");
    const newPassphrase = normalizeDatabasePassphrase(String(form.get("newPassphrase") || ""));
    const confirmPassphrase = normalizeDatabasePassphrase(String(form.get("confirmPassphrase") || ""));
    if (!currentPassphrase) {
      toast.error(t("gate.passphraseTooShort"));
      return;
    }
    if (!isDatabasePassphraseLongEnough(newPassphrase)) {
      toast.error(t("settings.export.passphraseTooShort"));
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      toast.error(t("toast.exportPassphrasesMismatch") || t("toast.passphrasesMismatch"));
      return;
    }
    try {
      await invokeCommand("change_database_password", { currentPassphrase, newPassphrase });
      toast.success(t("toast.databasePasswordChanged") || "Database password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return { importAppleHealthFile, exportDatabase, changeDatabasePassword };
}
