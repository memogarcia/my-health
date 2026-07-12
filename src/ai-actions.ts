import { invokeCommand } from "./platform/tauri-client";
import { getAiProvider, isLoopbackAiBaseUrl, type AiSettings } from "./ai-sdk-config";
import {
  addAiConversationMessage,
  buildAiConversationPrompt,
  getActiveAiConversation,
} from "./ai-conversation";
import type { AiConversation, DeveloperLogInput, DisplaySnapshot, LlmCallInput, LlmCallPatch, UserState } from "./dashboard-model";
import { t } from "./i18n";

export type AiPromptResult = {
  userState: UserState;
  toastMessage: string;
  toastKind: "success" | "error";
};

type PendingHandler = (userState: UserState, conversationId: string) => unknown;

export async function runAiPrompt(input: {
  prompt: string;
  aiSettings: AiSettings;
  display: DisplaySnapshot;
  userState: UserState;
  mode?: AiConversation["mode"];
  onPending: PendingHandler;
  onDeveloperLog: (input: DeveloperLogInput) => void;
  onLlmCallStart: (input: LlmCallInput) => string;
  onLlmCallUpdate: (callId: string, patch: LlmCallPatch) => void;
  shouldCancel?: () => boolean;
}) {
  const mode = input.mode || "chat";
  const provider = getAiProvider(input.aiSettings.providerId);
  const userMessage = addAiConversationMessage({
    userState: input.userState,
    role: "user",
    content: input.prompt,
    providerId: provider.id,
    modelId: input.aiSettings.modelId,
    mode,
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

  const staysOnDevice = provider.kind === "openai-compatible" && isLoopbackAiBaseUrl(input.aiSettings.baseUrl);
  if (!staysOnDevice && !input.aiSettings.allowRemoteHealthContext) {
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

  await input.onPending(userState, userMessage.conversationId);

  let callId = "";
  try {
    const conversation = getActiveAiConversation(userState);
    const conversationPrompt = conversation ? buildAiConversationPrompt(conversation, input.display, userState) : input.prompt;
    const diagnosticArea = mode === "research" ? "research" : "chat";
    const invokeTracked = async (prompt: string, inputLabel: string): Promise<string> => {
      callId = input.onLlmCallStart({
        kind: mode === "research" ? "research" : "chat",
        command: "ask_llm",
        inputLabel,
        modelId: input.aiSettings.modelId,
        reasoningEffort: input.aiSettings.reasoningEffort,
        promptChars: prompt.length,
        fileBytes: 0,
        renderedPages: 0,
      });
      input.onDeveloperLog({ area: diagnosticArea, level: "info", message: t("developer.log.callStarted"), detail: t("developer.log.command", { command: "ask_llm" }) });
      const response = String((await invokeCommand("ask_llm", {
        input: {
          prompt,
          modelId: input.aiSettings.modelId,
          reasoningEffort: input.aiSettings.reasoningEffort,
          dbPath: input.display.dbPath,
          mode,
        },
      })) || "").trim() || t("ai.noResponse");
      input.onLlmCallUpdate(callId, { status: "completed", outputChars: response.length });
      input.onDeveloperLog({ area: diagnosticArea, level: "success", message: t("developer.log.callCompleted"), detail: t("developer.log.chars", { count: response.length }) });
      callId = "";
      return response;
    };

    let response: string;
    if (mode === "research") {
      const evidencePrompt = appendResearchInstruction(conversationPrompt, [
        "Research pass 1 of 2: build an evidence map and analysis plan, not the final report.",
        "Inventory the most relevant dated records, changes, contradictions, missing data, and plausible relationships to test.",
        "Do not add facts that are absent from the supplied record.",
      ].join(" "));
      const evidenceMap = await invokeTracked(evidencePrompt, t("developer.call.researchEvidence"));
      if (input.shouldCancel?.()) throw new Error(t("jobs.cancelled"));
      const reportPrompt = appendResearchPlan(conversationPrompt, evidenceMap);
      response = await invokeTracked(reportPrompt, t("developer.call.researchReport"));
    } else {
      response = await invokeTracked(conversationPrompt, t("developer.call.chat"));
    }
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
    input.onDeveloperLog({ area: mode === "research" ? "research" : "chat", level: "error", message: t("developer.log.callFailed"), detail: message });
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

const MAX_LLM_PROMPT_CHARS = 240_000;
const MAX_RESEARCH_PLAN_CHARS = 12_000;

export function appendResearchInstruction(prompt: string, instruction: string): string {
  const available = Math.max(0, MAX_LLM_PROMPT_CHARS - prompt.length - 2);
  if (!available) return prompt;
  return `${prompt}\n\n${instruction.slice(0, available)}`;
}

export function appendResearchPlan(prompt: string, evidenceMap: string): string {
  const framing = [
    "Research pass 2 of 2: write the final report requested by the user.",
    "The draft evidence map below came from a first model pass. Treat it as analytical notes, not as evidence: verify every claim against the original dated record above and discard anything unsupported.",
    "--- DRAFT EVIDENCE MAP ---",
  ].join("\n");
  const available = Math.max(0, MAX_LLM_PROMPT_CHARS - prompt.length - 2);
  if (!available) return prompt;
  const boundedFraming = framing.slice(0, available);
  const planCapacity = Math.max(0, available - boundedFraming.length - 1);
  const plan = evidenceMap.slice(0, Math.min(MAX_RESEARCH_PLAN_CHARS, planCapacity));
  return `${prompt}\n\n${boundedFraming}${plan ? `\n${plan}` : ""}`;
}
