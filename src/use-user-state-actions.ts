import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { normalizeUserState, type ActivityEntry, type DialogKey, type UserState } from "./dashboard-model";
import { t } from "./i18n";
import { activityFromForm } from "./user-state";

type Options = {
  activityDraft: ActivityEntry | null;
  getUserState: () => UserState;
  persistUserState: (state: UserState) => Promise<boolean>;
  setActiveDialog: Dispatch<SetStateAction<DialogKey>>;
  setActivityDraft: Dispatch<SetStateAction<ActivityEntry | null>>;
  setUserState: (state: UserState) => void;
};

export function makeUserStateActions(options: Options) {
  function editActivity(entry: ActivityEntry): void {
    options.setActivityDraft(entry);
    options.setActiveDialog("activity");
  }

  async function saveActivity(form: FormData): Promise<void> {
    const current = options.getUserState();
    const parsed = activityFromForm(form);
    const entry = options.activityDraft ? { ...parsed, id: options.activityDraft.id } : parsed;
    const activityEntries = options.activityDraft
      ? current.activityEntries.map((item) => item.id === options.activityDraft?.id ? entry : item)
      : [entry, ...current.activityEntries];
    const next = normalizeUserState({ ...current, activityEntries });
    options.setUserState(next);
    options.setActivityDraft(null);
    options.setActiveDialog(null);
    if (await options.persistUserState(next)) {
      toast.success(t(options.activityDraft ? "toast.dailyLogUpdated" : "toast.dailyLogSaved"));
    }
  }

  async function deleteActivity(id: string): Promise<void> {
    const current = options.getUserState();
    if (!current.activityEntries.some((entry) => entry.id === id)) return;
    const next = normalizeUserState({
      ...current,
      activityEntries: current.activityEntries.filter((entry) => entry.id !== id),
    });
    options.setUserState(next);
    if (await options.persistUserState(next)) toast.success(t("toast.dailyLogDeleted"));
  }

  async function deleteAppleHealthImport(id: string): Promise<void> {
    const current = options.getUserState();
    const hasImport = current.appleHealthImports.some((entry) => (entry.id || entry.importedAt) === id);
    if (!hasImport) return;
    const next = normalizeUserState({
      ...current,
      appleHealthImports: current.appleHealthImports.filter((entry) => (entry.id || entry.importedAt) !== id),
    });
    options.setUserState(next);
    if (await options.persistUserState(next)) toast.success(t("toast.appleHealthDeleted"));
  }

  return { deleteActivity, deleteAppleHealthImport, editActivity, saveActivity };
}
