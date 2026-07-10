import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { hasEnabledCodexModel } from "../ai-sdk-config";
import { t } from "../i18n";
import { buildLifestylePlan, type LifestyleRecommendation } from "../lifestyle-insights";
import type { DashboardController } from "../use-dashboard-controller";
import { Activity, NotebookPen, Send, Sparkles, Wind } from "./health-icons";
import { StatusBadge } from "./health-status";

/* Lifestyle tab of the Research page. Local, non-AI suggestions derived from
   the saved snapshot, plus a Refine action that sends the same context to the
   model for a tailored plan. Coverage and signals live on the Deep research
   tab so the two views stop duplicating each other. */
export function LifestyleTab({ controller }: { controller: DashboardController }) {
  const plan = useMemo(() => buildLifestylePlan(controller.display, controller.userState), [controller.display, controller.userState]);
  const pending = Boolean(controller.aiPendingConversationId);
  const aiAvailable = hasEnabledCodexModel(controller.aiSettings);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 className="text-base font-semibold">{t("lifestyle.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("lifestyle.description")}</p>
        </div>
        <div className="grid justify-items-end gap-1.5">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => controller.openDialog("activity")}>
              <NotebookPen data-icon="inline-start" />
              {t("lifestyle.log")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !aiAvailable}
              aria-describedby={!aiAvailable ? "lifestyle-ai-availability" : undefined}
              onClick={() => void controller.submitAiPrompt(plan.prompt)}
            >
              <Send data-icon="inline-start" />
              {t("lifestyle.refine")}
            </Button>
            {!aiAvailable ? (
              <Button type="button" variant="outline" size="sm" onClick={() => controller.setSelectedNav("settings")}>
                {t("settings.ai.open")}
              </Button>
            ) : null}
          </div>
          {!aiAvailable ? (
            <p className="max-w-sm text-right text-xs text-muted-foreground" id="lifestyle-ai-availability">
              {t("lifestyle.refineUnavailable")}
            </p>
          ) : null}
        </div>
      </div>
      <section className="grid gap-3 md:grid-cols-2" aria-label={t("lifestyle.recommendationsLabel")}>
        {plan.recommendations.map((item) => <RecommendationCard item={item} key={item.category} />)}
      </section>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("lifestyle.thisWeek")}</SectionTitle>
        </SectionHeader>
        <SectionContent>
          <ol className="grid gap-2">
            {plan.routine.map((item, index) => (
              <li className="flex gap-2 text-sm" key={item}>
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </SectionContent>
      </Section>
    </div>
  );
}

function RecommendationCard({ item }: { item: LifestyleRecommendation }) {
  const Icon = item.category === "breathing" ? Wind : item.category === "exercise" ? Activity : item.category === "activity" ? NotebookPen : Sparkles;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-primary"><Icon /></span>
          {t(`lifestyle.generated.category.${item.category}`)}
        </CardTitle>
        <CardAction><StatusBadge status={item.priority} /></CardAction>
        <CardDescription>{item.title}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">{item.body}</p>
        <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm">{item.action}</div>
        <div className="flex flex-wrap gap-1.5">
          {item.evidence.map((evidence) => <Badge variant="outline" key={evidence}>{evidence}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}
