import { invoke } from "@tauri-apps/api/core";
import { getAiProvider, type AiSettings } from "./ai-sdk-config";
import {
  addAiConversationMessage,
  buildCodexConversationPrompt,
  getActiveAiConversation,
} from "./ai-conversation";
import type { UserState } from "./dashboard-model";
import { t } from "./i18n";

export type AiPromptResult = {
  userState: UserState;
  toastMessage: string;
  toastKind: "success" | "error";
};

type PendingHandler = (userState: UserState, conversationId: string, notice: string) => unknown;

export async function runAiPrompt(input: {
  prompt: string;
  aiSettings: AiSettings;
  userState: UserState;
  onPending: PendingHandler;
}) {
  const provider = getAiProvider(input.aiSettings.providerId);
  const userMessage = addAiConversationMessage({
    userState: input.userState,
    role: "user",
    content: input.prompt,
    providerId: provider.id,
    modelId: input.aiSettings.modelId,
  });
  let userState = userMessage.userState;

  if (provider.id === "none") {
    userState = addAiConversationMessage({
      userState,
      conversationId: userMessage.conversationId,
      role: "assistant",
      content: t("ai.notConfigured"),
      providerId: provider.id,
      modelId: input.aiSettings.modelId,
      isError: true,
    }).userState;
    return { userState, toastMessage: t("toast.aiNotConfigured"), toastKind: "error" };
  }

  if (provider.id !== "codex") {
    userState = addAiConversationMessage({
      userState,
      conversationId: userMessage.conversationId,
      role: "assistant",
      content: t("ai.providerNotLive", { provider: provider.label }),
      providerId: provider.id,
      modelId: input.aiSettings.modelId,
      isError: true,
    }).userState;
    return { userState, toastMessage: t("toast.providerNotConnected"), toastKind: "error" };
  }
  if (!input.aiSettings.allowRemoteHealthContext) {
    userState = addAiConversationMessage({
      userState,
      conversationId: userMessage.conversationId,
      role: "assistant",
      content: t("ai.remoteContextBlocked"),
      providerId: provider.id,
      modelId: input.aiSettings.modelId,
      isError: true,
    }).userState;
    return { userState, toastMessage: t("toast.remoteBlocked"), toastKind: "error" };
  }

  await input.onPending(userState, userMessage.conversationId, t("toast.codexThinking"));

  try {
    const conversation = getActiveAiConversation(userState);
    const codexPrompt = conversation ? buildCodexConversationPrompt(conversation) : input.prompt;
    const response = String((await invoke("ask_llm", {
      input: {
        prompt: codexPrompt,
        modelId: input.aiSettings.modelId,
        reasoningEffort: input.aiSettings.reasoningEffort,
      },
    })) || "").trim() || t("ai.noResponse");
    userState = addAiConversationMessage({
      userState,
      conversationId: userMessage.conversationId,
      role: "assistant",
      content: response,
      providerId: provider.id,
      modelId: input.aiSettings.modelId,
    }).userState;
    return { userState, toastMessage: t("toast.aiSaved"), toastKind: "success" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    userState = addAiConversationMessage({
      userState,
      conversationId: userMessage.conversationId,
      role: "assistant",
      content: t("ai.requestFailed", { message }),
      providerId: provider.id,
      modelId: input.aiSettings.modelId,
      isError: true,
    }).userState;
    return { userState, toastMessage: t("toast.aiFailed"), toastKind: "error" };
  }
}
