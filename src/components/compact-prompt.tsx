import { useState } from "react";
import { getAiProvider, hasEnabledAiModel } from "../ai-sdk-config";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

const promptShell =
  "grid w-[min(720px,calc(100%-3.5rem))] mx-auto mb-4 gap-2 rounded-2xl border border-transparent bg-secondary p-[10px_12px_8px] shadow-[0_1px_2px_oklch(0.08_0.01_290/0.22)] transition-all focus-within:bg-surface focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/35";

export function CompactPrompt({ controller }: { controller: DashboardController }) {
  const [prompt, setPrompt] = useState("");
  const available = hasEnabledAiModel(controller.aiSettings);
  const pending = Boolean(controller.aiPendingConversationId);
  if (!available) {
    return (
      <aside
        aria-label={t("appShell.askAiLabel")}
        className={`${promptShell} min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center`}
      >
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-ink">
          <Icon name="sparkles" />
          {t("chat.setupRequired")}
        </span>
        <button
          className="inline-flex min-h-[30px] items-center justify-center gap-[7px] rounded-[12px] bg-surface px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-[color-mix(in_oklch,var(--surface-soft)_80%,var(--plum)_8%)]"
          onClick={() => controller.setSelectedNav("settings")}
          type="button"
        >
          {t("settings.ai.open")}
        </button>
      </aside>
    );
  }
  const provider = getAiProvider(controller.aiSettings.providerId);
  return (
    <form
      aria-label={t("appShell.askAiLabel")}
      className={`${promptShell} min-h-[94px]`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!prompt.trim()) return;
        void controller.submitAiPrompt(prompt);
        setPrompt("");
      }}
    >
      <textarea
        aria-label={t("appShell.promptPlaceholder")}
        className="min-h-[42px] w-full min-w-0 resize-none border-0 bg-transparent p-[7px_4px] text-sm leading-relaxed text-ink outline-none focus:outline-none focus-visible:outline-none placeholder:text-quiet disabled:opacity-60"
        disabled={pending}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) event.currentTarget.form?.requestSubmit();
        }}
        placeholder={t("appShell.promptPlaceholder")}
        rows={1}
        value={prompt}
      />
      <div className="flex min-h-[30px] items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-ink">
          <Icon name="sparkles" />
          <b className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-ink">{provider.label}</b>
        </span>
        <button
          aria-label={pending ? t("common.sending") : t("common.send")}
          className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-accent-strong disabled:bg-[color-mix(in_oklch,var(--ink)_15%,var(--surface-soft))] disabled:text-quiet"
          disabled={pending || !prompt.trim()}
          type="submit"
        >
          <span className="rotate-[-90deg]"><Icon name="chevron" /></span>
        </button>
      </div>
    </form>
  );
}
