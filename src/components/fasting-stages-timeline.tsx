import { Activity, CheckCircle2, Flame } from "lucide-react";
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
    <Card className="self-start overflow-hidden border border-border/50 bg-surface/40 shadow-xl backdrop-blur-xl rounded-[2.5rem] transition-all duration-500 hover:bg-surface/50 h-full flex flex-col">
      <CardHeader className="border-b border-border/40 pb-5 pt-8 px-8 flex-none">
        <CardTitle className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Flame className="size-6 text-accent-strong" />
          {t("fasting.stages.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex-1 px-4 py-6 md:px-8">
          <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[35px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/80 before:to-transparent">
            {FASTING_STAGES.map((stage, index) => {
              const next = FASTING_STAGES[index + 1];
              const state = !activeStartedAt ? "upcoming" : stage.hours === currentStage.hours ? "current" : stage.hours < currentStage.hours ? "passed" : "upcoming";

              return (
                <div key={stage.hours} className="relative flex items-start gap-6 group">

                  {/* Timeline Node */}
                  <div className="absolute left-0 -ml-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-sm border-2 border-surface z-10 transition-transform duration-300 group-hover:scale-110">
                    <div className={cn(
                      "h-4 w-4 rounded-full transition-colors duration-500",
                      state === "current" ? "bg-primary animate-pulse shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.8)]" :
                      state === "passed" ? "bg-primary" : "bg-border"
                    )} />
                  </div>

                  {/* Content Card */}
                  <div className={cn(
                    "flex-1 ml-6 rounded-2xl p-5 border transition-all duration-500 relative overflow-hidden",
                    state === "current" ? "bg-primary/5 border-primary/30 shadow-[0_4px_20px_rgba(var(--color-primary-rgb),0.1)] scale-[1.02] transform-gpu" :
                    state === "passed" ? "bg-surface border-border/50 shadow-sm" :
                    "bg-transparent border-transparent opacity-60 grayscale-[0.3] hover:grayscale-0 hover:opacity-100"
                  )}>
                    {state === "current" && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.8)]" />
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider tnum border",
                        state === "passed" ? "bg-primary/10 text-primary border-primary/20" :
                        state === "current" ? "bg-primary text-white border-primary" :
                        "bg-canvas text-muted-ink border-border"
                      )}>
                        {next ? t("fasting.stage.range", { start: stage.hours, end: next.hours }) : t("fasting.stage.rangePlus", { hours: stage.hours })}
                      </span>

                      {state === "current" && (
                        <CheckCircle2 className="size-5 text-primary drop-shadow-sm animate-in zoom-in duration-500" />
                      )}
                    </div>

                    <strong className={cn(
                      "block text-lg tracking-tight mb-1",
                      state === "current" ? "font-bold text-ink" : "font-semibold text-ink/90"
                    )}>
                      {t(stage.titleKey)}
                    </strong>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      state === "current" ? "text-muted-ink" : "text-muted-ink/80"
                    )}>
                      {t(stage.descriptionKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/40 bg-canvas/50 px-8 py-5 backdrop-blur-md flex-none">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-ink/80 leading-relaxed">
            <Activity className="size-4 opacity-50" />
            {t("fasting.stages.variability")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
