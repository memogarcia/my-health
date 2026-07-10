import { useState } from "react";
import { getAiProvider, hasEnabledAiModel } from "../ai-sdk-config";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

export function CompactPrompt({ controller }: { controller: DashboardController }) {
  const [prompt, setPrompt] = useState("");
  const available = hasEnabledAiModel(controller.aiSettings);
  const pending = Boolean(controller.aiPendingConversationId);
  if (!available) {
    return (
      <aside aria-label={t("appShell.askAiLabel")} className="compact-prompt compact-prompt-empty">
        <span><Icon name="sparkles" />{t("chat.setupRequired")}</span>
        <button className="secondary-button" onClick={() => controller.setSelectedNav("settings")} type="button">{t("settings.ai.open")}</button>
      </aside>
    );
  }
  const provider = getAiProvider(controller.aiSettings.providerId);
  return (
    <form aria-label={t("appShell.askAiLabel")} className="compact-prompt" onSubmit={(event) => {
      event.preventDefault();
      if (!prompt.trim()) return;
      void controller.submitAiPrompt(prompt);
      setPrompt("");
    }}>
      <span className="prompt-provider"><Icon name="sparkles" /><b>{provider.label}</b></span>
      <textarea aria-label={t("appShell.promptPlaceholder")} disabled={pending} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) event.currentTarget.form?.requestSubmit();
      }} placeholder={t("appShell.promptPlaceholder")} rows={1} value={prompt} />
      <button aria-label={pending ? t("common.sending") : t("common.send")} className="prompt-send" disabled={pending || !prompt.trim()} type="submit"><Icon name="chevron" /></button>
    </form>
  );
}
