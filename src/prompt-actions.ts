import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { runAiPrompt } from "./ai-actions";
import type { AiSettings } from "./ai-sdk-config";
import { mergeAiConversationState, setActiveAiConversation, startNewAiConversation } from "./ai-conversation";
import { todayString } from "./dashboard-format";
import type { NavKey, RegimenInput, UserState } from "./dashboard-model";
import { t } from "./i18n";
import { promptIntakeFromText } from "./prompt-intake";
import type { useDocumentIntake } from "./use-document-intake";

export type RegimenDraft = { id: string; input: RegimenInput };

type PromptActionsOptions = {
  aiPendingConversationId: string;
  aiSettings: AiSettings;
  documentIntake: Pick<ReturnType<typeof useDocumentIntake>, "prepareDocumentResult" | "preparePromptResults">;
  persistUserState: (next: UserState) => Promise<boolean>;
  databaseEpoch: number;
  isDatabaseCurrent: (epoch: number) => boolean;
  getUserState: () => UserState;
  selectedOrganKey: string;
  setAiPendingConversationId: (id: string) => void;
  setRegimenDraft: Dispatch<SetStateAction<RegimenDraft | null>>;
  setSelectedNav: (nav: NavKey) => void;
  setUserState: Dispatch<SetStateAction<UserState>>;
  userState: UserState;
};

export function makePromptActions(options: PromptActionsOptions) {
  function startAiConversation(): void {
    const next = startNewAiConversation(options.userState);
    options.setUserState(next);
    options.setSelectedNav("plan");
    toast.info(t("toast.newConversation"));
    void options.persistUserState(next);
  }

  function selectAiConversation(conversationId: string): void {
    const next = setActiveAiConversation(options.userState, conversationId);
    options.setUserState(next);
    options.setSelectedNav("plan");
    void options.persistUserState(next);
  }

  async function submitAiPrompt(prompt: string, file?: File): Promise<void> {
    if (options.aiPendingConversationId) {
      toast.info(t("toast.waitForAi"));
      return;
    }
    if (file) {
      options.documentIntake.prepareDocumentResult(file);
      if (prompt.trim()) toast.info(t("toast.usingAttachedFile"));
      return;
    }
    if (!prompt.trim()) {
      toast.info(t("toast.enterPrompt"));
      return;
    }

    const intake = promptIntakeFromText(prompt, { today: todayString(), organKey: options.selectedOrganKey });
    if (intake.kind === "result") {
      options.documentIntake.preparePromptResults([intake.result]);
      toast.info(t("toast.draftedResult"));
      return;
    }
    if (intake.kind === "regimen") {
      options.setRegimenDraft({ id: newDraftId(), input: intake.input });
      options.setSelectedNav("medications");
      toast.info(t("toast.draftedMedication"));
      return;
    }

    options.setSelectedNav("plan");
    options.setAiPendingConversationId("pending");
    const result = await runAiPrompt({
      prompt: prompt.trim(),
      aiSettings: options.aiSettings,
      userState: options.userState,
      onPending: async (nextState, conversationId, notice) => {
        if (!options.isDatabaseCurrent(options.databaseEpoch)) return;
        options.setUserState(nextState);
        options.setAiPendingConversationId(conversationId);
        toast.info(notice);
        await options.persistUserState(nextState);
      },
    });
    if (!options.isDatabaseCurrent(options.databaseEpoch)) return;
    options.setAiPendingConversationId("");
    const next = mergeAiConversationState(options.getUserState(), result.userState);
    options.setUserState(next);
    const persisted = await options.persistUserState(next);
    if (result.toastKind === "success") {
      if (persisted) toast.success(result.toastMessage);
    } else {
      toast.error(result.toastMessage);
    }
  }

  return { selectAiConversation, startAiConversation, submitAiPrompt };
}

function newDraftId(): string {
  return globalThis.crypto?.randomUUID?.() || String(Date.now());
}
