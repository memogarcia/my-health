import { useState } from "react";
import { getAiProvider, hasEnabledAiModel } from "@/ai-sdk-config";
import { t } from "@/platform/i18n";
import type { DashboardController } from "@/use-dashboard-controller";
import { PromptComposer } from "@/components/prompt-composer";

export function CompactPrompt({ controller }: { controller: DashboardController }) {
  const [prompt, setPrompt] = useState("");
  const available = hasEnabledAiModel(controller.aiSettings);
  const pending = Boolean(controller.aiPendingConversationId);
  const provider = getAiProvider(controller.aiSettings.providerId);

  return (
    <PromptComposer
      ariaLabel={t("appShell.askAiLabel")}
      available={available}
      mode="dock"
      onOpenSettings={() => controller.setSelectedNav("settings")}
      onSubmit={(value) => {
        setPrompt("");
        void controller.submitAiPrompt(value);
      }}
      onValueChange={setPrompt}
      pending={pending}
      pendingLabel={t("common.sending")}
      placeholder={t("appShell.promptPlaceholder")}
      providerLabel={provider.label}
      settingsLabel={t("settings.ai.open")}
      setupMessage={t("chat.setupRequired")}
      submitLabel={t("common.send")}
      value={prompt}
    />
  );
}
