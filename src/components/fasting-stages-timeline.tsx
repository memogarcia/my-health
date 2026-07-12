import { Check, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t, type TranslationKey } from "../i18n";

export type FastingStage = { hours: number; titleKey: TranslationKey; descriptionKey: TranslationKey };

export const FASTING_STAGES: FastingStage[] = [
  { hours: 0, titleKey: "fasting.stage.0.title", descriptionKey: "fasting.stage.0.description" },
  { hours: 4, titleKey: "fasting.stage.4.title", descriptionKey: "fasting.stage.4.description" },
  { hours: 8, titleKey: "fasting.stage.8.title", descriptionKey: "fasting.stage.8.description" },
  { hours: 12, titleKey: "fasting.stage.12.title", descriptionKey: "fasting.stage.12.description" },
  { hours: 16, titleKey: "fasting.stage.16.title", descriptionKey: "fasting.stage.16.description" },
  { hours: 18, titleKey: "fasting.stage.18.title", descriptionKey: "fasting.stage.18.description" },
];

export function FastingStagesTimeline({ activeStartedAt, currentStage }: { activeStartedAt: string; currentStage: FastingStage }) {
  return (
    <Card>
      <CardHeader className="border-b border-border/60">
        <CardTitle>{t("fasting.stages.title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-0 px-0">
        {FASTING_STAGES.map((stage, index) => {
          const next = FASTING_STAGES[index + 1];
          const state = !activeStartedAt ? "upcoming" : stage.hours === currentStage.hours ? "current" : stage.hours < currentStage.hours ? "passed" : "upcoming";
          return (
            <details
              className="group border-b border-border/55 px-4 last:border-b-0"
              open={state === "current" ? true : undefined}
              key={stage.hours}
            >
              <summary className="grid cursor-pointer list-none grid-cols-[20px_minmax(0,1fr)_auto_16px] items-center gap-2 py-3 marker:content-none">
                <span className={cn(
                  "grid size-4 place-items-center rounded-full border border-border text-transparent",
                  state === "passed" && "border-normal bg-normal text-canvas",
                  state === "current" && "border-primary bg-primary text-primary-foreground",
                )}>
                  {state === "passed" ? <Check className="size-2.5" /> : null}
                </span>
                <strong className={cn("truncate text-sm font-medium text-ink", state === "upcoming" && "text-muted-ink")}>{t(stage.titleKey)}</strong>
                <span className="text-[0.6875rem] text-muted-ink tabular-nums">
                  {next ? t("fasting.stage.range", { start: stage.hours, end: next.hours }) : t("fasting.stage.rangePlus", { hours: stage.hours })}
                </span>
                <ChevronDown className="size-3.5 text-muted-ink transition-transform duration-[var(--dur-state)] group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-3 pl-7 text-xs leading-relaxed text-muted-ink">{t(stage.descriptionKey)}</p>
            </details>
          );
        })}
        <p className="border-t border-border/60 bg-secondary/35 px-4 py-3 text-[0.6875rem] leading-relaxed text-muted-ink">
          {t("fasting.stages.variability")}
        </p>
      </CardContent>
    </Card>
  );
}
