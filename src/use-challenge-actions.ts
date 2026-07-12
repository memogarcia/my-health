import { toast } from "sonner";
import { normalizeUserState, type Challenge, type UserState } from "./dashboard-model";
import { t } from "./i18n";

type Options = {
  getUserState: () => UserState;
  setUserState: (state: UserState) => void;
  persistUserState: (state: UserState) => Promise<boolean>;
};

export function makeChallengeActions(options: Options) {
  async function saveChallenge(input: Omit<Challenge, "id" | "createdAt" | "completed">, id?: string): Promise<boolean> {
    const current = options.getUserState();
    if (!input.title.trim() || !/^\d{4}-\d{2}-\d{2}$/u.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(input.endDate) || input.endDate < input.startDate) return false;
    const existing = id ? current.challenges.find((challenge) => challenge.id === id) : undefined;
    const challenge: Challenge = {
      ...input,
      id: existing?.id || makeId(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      completed: existing?.completed || false,
      title: input.title.trim(),
      description: input.description.trim(),
      measure: input.measure.trim(),
    };
    const challenges = existing ? current.challenges.map((item) => item.id === id ? challenge : item) : [challenge, ...current.challenges];
    const next = normalizeUserState({ ...current, challenges });
    options.setUserState(next);
    if (await options.persistUserState(next)) toast.success(t(existing ? "toast.challengeUpdated" : "toast.challengeSaved"));
    return true;
  }

  async function toggleChallenge(id: string): Promise<void> {
    const current = options.getUserState();
    if (!current.challenges.some((challenge) => challenge.id === id)) return;
    const next = normalizeUserState({ ...current, challenges: current.challenges.map((challenge) => challenge.id === id ? { ...challenge, completed: !challenge.completed } : challenge) });
    options.setUserState(next);
    if (await options.persistUserState(next)) toast.success(t("toast.challengeUpdated"));
  }

  async function deleteChallenge(id: string): Promise<void> {
    const current = options.getUserState();
    if (!current.challenges.some((challenge) => challenge.id === id)) return;
    const next = normalizeUserState({ ...current, challenges: current.challenges.filter((challenge) => challenge.id !== id) });
    options.setUserState(next);
    if (await options.persistUserState(next)) toast.success(t("toast.challengeDeleted"));
  }

  return { deleteChallenge, saveChallenge, toggleChallenge };
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
