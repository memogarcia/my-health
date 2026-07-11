import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAiProvider, hasEnabledCodexModel } from "../ai-sdk-config";
import { t } from "../i18n";
import { buildDeepResearchBrief, type CoverageItem } from "../lifestyle-insights";
import type { DashboardController } from "../use-dashboard-controller";
import { DataCoverageBars } from "./charts/data-coverage-bars";
import { LifestyleTab } from "./lifestyle-page";
import { PromptComposer } from "./prompt-composer";

export function ResearchPage({ controller }: { controller: DashboardController }) {
  return (
    <Tabs defaultValue="lifestyle" className="research-page gap-4">
      <TabsList>
        <TabsTrigger value="lifestyle">{t("research.tab.lifestyle")}</TabsTrigger>
        <TabsTrigger value="research">{t("research.tab.deep")}</TabsTrigger>
      </TabsList>
      <TabsContent value="lifestyle">
        <LifestyleTab controller={controller} />
      </TabsContent>
      <TabsContent value="research">
        <DeepResearchTab controller={controller} />
      </TabsContent>
    </Tabs>
  );
}

function DeepResearchTab({ controller }: { controller: DashboardController }) {
  const brief = useMemo(() => buildDeepResearchBrief(controller.display, controller.userState), [controller.display, controller.userState]);
  const provider = getAiProvider(controller.aiSettings.providerId);
  const pending = Boolean(controller.aiPendingConversationId);
  const aiAvailable = hasEnabledCodexModel(controller.aiSettings);
  const [reviewedPrompt, setReviewedPrompt] = useState("");
  const promptReviewed = reviewedPrompt === brief.prompt;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-ink">{t("research.advisory")}</p>
        <CoverageLine items={brief.coverage} />
      </div>
      <DataCoverageBars items={brief.coverage.map((item) => ({ key: item.label, label: item.label, count: Number(item.value) || 0 }))} />
      <PromptComposer
        ariaLabel={t("research.reviewPrompt")}
        available={aiAvailable}
        mode="review"
        onOpenSettings={() => controller.setSelectedNav("settings")}
        onReview={() => setReviewedPrompt(brief.prompt)}
        onSubmit={(value) => {
          void controller.submitAiPrompt(value, undefined, {
            kind: "deep-research",
            title: t("jobs.deepResearch"),
            description: t("jobs.deepResearchDescription"),
          });
        }}
        pending={pending}
        pendingLabel={t("research.starting")}
        placeholder={t("research.reviewPrompt")}
        providerLabel={provider.label}
        readOnly
        reviewed={promptReviewed}
        reviewedLabel={t("research.promptReviewed")}
        reviewRequiredLabel={t("research.reviewRequired")}
        reviewSummary={t("research.reviewPrompt")}
        settingsLabel={t("settings.ai.open")}
        setupMessage={t("research.setupRequired")}
        submitLabel={t("research.start")}
        value={brief.prompt}
      />
    </div>
  );
}

function CoverageLine({ items }: { items: CoverageItem[] }) {
  return (
    <p className="text-xs text-muted-ink tnum">
      {items.map((item) => `${item.value} ${item.label.toLowerCase()}`).join(" · ")}
    </p>
  );
}
