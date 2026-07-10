import { invoke } from "@tauri-apps/api/core";
import { getAiProvider, type AiSettings } from "./ai-sdk-config";
import {
  addAiConversationMessage,
  buildAiConversationPrompt,
  getActiveAiConversation,
} from "./ai-conversation";
import type { DeveloperLogInput, DisplaySnapshot, LlmCallInput, LlmCallPatch, UserState } from "./dashboard-model";
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
  display: DisplaySnapshot;
  userState: UserState;
  onPending: PendingHandler;
  onDeveloperLog: (input: DeveloperLogInput) => void;
  onLlmCallStart: (input: LlmCallInput) => string;
  onLlmCallUpdate: (callId: string, patch: LlmCallPatch) => void;
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

  if (!provider.local && !input.aiSettings.allowRemoteHealthContext) {
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

  await input.onPending(userState, userMessage.conversationId, t("toast.aiThinking", { provider: provider.label }));

  let callId = "";
  try {
    const conversation = getActiveAiConversation(userState);
    const conversationPrompt = conversation ? buildAiConversationPrompt(conversation, input.display, userState) : input.prompt;
    callId = input.onLlmCallStart({
      kind: "chat",
      command: "ask_llm",
      inputLabel: t("developer.call.chat"),
      modelId: input.aiSettings.modelId,
      reasoningEffort: input.aiSettings.reasoningEffort,
      promptChars: conversationPrompt.length,
      fileBytes: 0,
      renderedPages: 0,
    });
    input.onDeveloperLog({ area: "chat", level: "info", message: t("developer.log.callStarted"), detail: t("developer.log.command", { command: "ask_llm" }) });
    const response = String((await invoke("ask_llm", {
      input: {
        prompt: conversationPrompt,
        modelId: input.aiSettings.modelId,
        reasoningEffort: input.aiSettings.reasoningEffort,
      },
    })) || "").trim() || t("ai.noResponse");
    input.onLlmCallUpdate(callId, { status: "completed", outputChars: response.length });
    input.onDeveloperLog({ area: "chat", level: "success", message: t("developer.log.callCompleted"), detail: t("developer.log.chars", { count: response.length }) });
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
    if (callId) input.onLlmCallUpdate(callId, { status: "failed", error: message });
    input.onDeveloperLog({ area: "chat", level: "error", message: t("developer.log.callFailed"), detail: message });
    const authHint = provider.id === "lmstudio" && message.includes("401 Unauthorized")
      ? `\n\n${t("ai.lmStudioAuthHint")}`
      : "";
    userState = addAiConversationMessage({
      userState,
      conversationId: userMessage.conversationId,
      role: "assistant",
      content: t("ai.requestFailed", { message: `${message}${authHint}` }),
      providerId: provider.id,
      modelId: input.aiSettings.modelId,
      isError: true,
    }).userState;
    return { userState, toastMessage: t("toast.aiFailed"), toastKind: "error" };
  }
}
