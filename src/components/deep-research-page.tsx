import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAiProvider, hasEnabledCodexModel } from "../ai-sdk-config";
import { t } from "../i18n";
import { buildDeepResearchBrief, type CoverageItem } from "../lifestyle-insights";
import type { DashboardController } from "../use-dashboard-controller";
import { DataCoverageBars } from "./charts/data-coverage-bars";
import { LifestyleTab } from "./lifestyle-page";
import { LoaderCircle, Send } from "./health-icons";

/* Merged Research destination. Two tabs share one nav entry so the previous
   Lifestyle and Deep Research pages stop duplicating coverage, signals, and
   the send-to-AI path. Lifestyle is the default (local value, no AI cost);
   Deep research sends a structured prompt after the user reviews it. */
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
  const canStart = aiAvailable && promptReviewed && !pending;
  const readinessMessage = !aiAvailable
    ? t("research.setupRequired")
    : promptReviewed
      ? t("research.promptReviewed")
      : t("research.reviewRequired");

  return (
    <div className="deep-research-page grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={!canStart}
              aria-describedby="research-readiness"
              onClick={() => {
                if (canStart) void controller.submitAiPrompt(brief.prompt, undefined, {
                  kind: "deep-research",
                  title: t("jobs.deepResearch"),
                  description: t("jobs.deepResearchDescription"),
                });
              }}
            >
              {pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}
              {pending ? t("research.starting") : t("research.start")}
            </Button>
            <Badge variant="outline">{provider.label}</Badge>
            {!aiAvailable ? (
              <Button type="button" variant="outline" size="sm" onClick={() => controller.setSelectedNav("settings")}>
                {t("settings.ai.open")}
              </Button>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground" id="research-readiness" role="status" aria-live="polite">
            {readinessMessage}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("research.advisory")}
          </p>
        </div>
        <CoverageLine items={brief.coverage} />
      </div>
      <DataCoverageBars items={brief.coverage.map((item) => ({ key: item.label, label: item.label, count: Number(item.value) || 0 }))} />
      <details
        key={brief.prompt}
        className="group rounded-lg border border-border bg-card"
        onToggle={(event) => {
          if (event.currentTarget.open) setReviewedPrompt(brief.prompt);
        }}
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          {t("research.reviewPrompt")}
        </summary>
        <div className="border-t border-border px-4 py-3">
          <Textarea aria-label={t("research.reviewPrompt")} className="min-h-[26rem] resize-none font-mono text-xs leading-relaxed" readOnly value={brief.prompt} />
        </div>
      </details>
    </div>
  );
}

function CoverageLine({ items }: { items: CoverageItem[] }) {
  return (
    <p className="text-xs text-muted-foreground tnum">
      {items.map((item) => `${item.value} ${item.label.toLowerCase()}`).join(" · ")}
    </p>
  );
}
