import { toast } from "sonner";
import { normalizeUserState, type UserState } from "./dashboard-model";
import { normalizeShortcuts, type ShortcutMap } from "./shortcuts";
import { t } from "./i18n";

type Options = {
  getUserState: () => UserState;
  setUserState: (state: UserState) => void;
  persistUserState: (state: UserState) => Promise<boolean>;
};

export function makeShortcutActions(options: Options) {
  async function saveShortcuts(value: ShortcutMap): Promise<boolean> {
    const current = options.getUserState();
    const next = normalizeUserState({ ...current, shortcuts: normalizeShortcuts(value) });
    options.setUserState(next);
    if (await options.persistUserState(next)) {
      toast.success(t("toast.shortcutsSaved"));
      return true;
    }
    return false;
  }

  return { saveShortcuts };
}
