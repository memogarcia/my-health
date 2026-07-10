import { toast } from "sonner";
import { normalizeUserState, type UserState } from "./dashboard-model";
import { t } from "./i18n";

type Options = {
  getUserState: () => UserState;
  setUserState: (state: UserState) => void;
  persistUserState: (state: UserState) => Promise<boolean>;
};

export function makeFastingActions({ getUserState, setUserState, persistUserState }: Options) {
  async function setFastingTarget(targetHours: number): Promise<void> {
    const current = getUserState();
    const next = normalizeUserState({ ...current, fasting: { ...current.fasting, targetHours } });
    setUserState(next);
    await persistUserState(next);
  }

  async function startFasting(targetHours: number): Promise<void> {
    const current = getUserState();
    const next = normalizeUserState({
      ...current,
      fasting: { ...current.fasting, activeStartedAt: new Date().toISOString(), targetHours },
    });
    setUserState(next);
    if (await persistUserState(next)) toast.success(t("toast.fastStarted"));
  }

  async function endFasting(): Promise<void> {
    const current = getUserState();
    if (!current.fasting.activeStartedAt) return;
    const endedAt = new Date().toISOString();
    const next = normalizeUserState({
      ...current,
      fasting: {
        ...current.fasting,
        activeStartedAt: "",
        sessions: [{
          id: globalThis.crypto?.randomUUID?.() || `fast-${Date.now()}`,
          startedAt: current.fasting.activeStartedAt,
          endedAt,
          targetHours: current.fasting.targetHours,
        }, ...current.fasting.sessions],
      },
    });
    setUserState(next);
    if (await persistUserState(next)) toast.success(t("toast.fastEnded"));
  }

  return { setFastingTarget, startFasting, endFasting };
}
