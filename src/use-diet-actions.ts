import { toast } from "sonner";
import { normalizeUserState, type UserState } from "./dashboard-model";
import { t } from "./i18n";
import { dietEntryFromForm } from "./user-state";

type Options = {
  getUserState: () => UserState;
  setUserState: (state: UserState) => void;
  persistUserState: (state: UserState) => Promise<boolean>;
};

export function makeDietActions({ getUserState, setUserState, persistUserState }: Options) {
  async function saveDietEntry(form: FormData, entryId?: string): Promise<boolean> {
    const current = getUserState();
    const entry = dietEntryFromForm(form, entryId);
    if (!entry.title || !/^\d{4}-\d{2}-\d{2}$/u.test(entry.loggedAt)) return false;
    const dietEntries = entryId && current.dietEntries.some((item) => item.id === entryId)
      ? current.dietEntries.map((item) => item.id === entryId ? entry : item)
      : [entry, ...current.dietEntries];
    const next = normalizeUserState({ ...current, dietEntries });
    setUserState(next);
    if (await persistUserState(next)) toast.success(t(entryId ? "toast.dietUpdated" : "toast.dietSaved"));
    return true;
  }

  async function deleteDietEntry(id: string): Promise<void> {
    const current = getUserState();
    if (!current.dietEntries.some((entry) => entry.id === id)) return;
    const next = normalizeUserState({
      ...current,
      dietEntries: current.dietEntries.filter((entry) => entry.id !== id),
    });
    setUserState(next);
    if (await persistUserState(next)) toast.success(t("toast.dietDeleted"));
  }

  return { deleteDietEntry, saveDietEntry };
}
