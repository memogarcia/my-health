import { useEffect, useMemo, useState } from "react";
import { Play, Square, Target } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AlertTriangle, Timer } from "./health-icons";
import { FastingHistory } from "./fasting-history";
import { formatCompactDuration, formatElapsed } from "./fasting-format";
import { FASTING_STAGES, FastingStagesTimeline } from "./fasting-stages-timeline";
import { isValidFastingTarget } from "../fasting-state";

const targetOptions = [12, 14, 16, 18, 20, 24, 36, 48, 72];

export function FastingPage({ controller }: { controller: DashboardController }) {
  const [now, setNow] = useState(Date.now());
  const [customHoursInput, setCustomHoursInput] = useState("");
  const fasting = controller.userState.fasting;
  const elapsedSeconds = fasting.activeStartedAt ? Math.max(0, Math.floor((now - Date.parse(fasting.activeStartedAt)) / 1000)) : 0;
  const elapsedHours = elapsedSeconds / 3600;
  const currentStage = [...FASTING_STAGES].reverse().find((stage) => elapsedHours >= stage.hours) || FASTING_STAGES[0];
  const progress = fasting.activeStartedAt ? Math.min(100, (elapsedHours / fasting.targetHours) * 100) : 0;
  const targetRemainingSeconds = Math.max(0, Math.ceil(fasting.targetHours * 3600 - elapsedSeconds));
  const nextStage = FASTING_STAGES.find((stage) => stage.hours > elapsedHours);
  const targetStatus = targetRemainingSeconds === 0
    ? t("fasting.timer.targetReached")
    : t("fasting.timer.remaining", { time: formatCompactDuration(targetRemainingSeconds) });
  const nextZoneStatus = nextStage && nextStage.hours <= fasting.targetHours
    ? t("fasting.timer.nextZone", { zone: t(nextStage.titleKey), time: formatCompactDuration(Math.max(0, Math.ceil(nextStage.hours * 3600 - elapsedSeconds))) })
    : "";
  const recentSessions = useMemo(() => fasting.sessions.slice(0, 5), [fasting.sessions]);

  useEffect(() => {
    if (!fasting.activeStartedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [fasting.activeStartedAt]);

  function applyCustomTarget(): void {
    const value = Number(customHoursInput);
    if (!isValidFastingTarget(value)) return;
    void controller.setFastingTarget(value);
    setCustomHoursInput("");
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 px-8 py-7 max-[880px]:px-5">
      <header className="border-b border-border/55 pb-5">
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">{t("nav.fasting.label")}</h1>
        <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted-ink">{t("fasting.description")}</p>
      </header>
      <Alert className="border-monitor/30 bg-monitor/7">
        <AlertTriangle className="text-monitor" />
        <AlertTitle>{t("fasting.safety.title")}</AlertTitle>
        <AlertDescription className="text-muted-ink">{t("fasting.safety.description")}</AlertDescription>
      </Alert>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]" aria-label={t("fasting.timer.label")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-4 text-primary" />
              {t("fasting.timer.title")}
            </CardTitle>
            {fasting.activeStartedAt ? <Badge variant="secondary">{t("fasting.timer.inProgress")}</Badge> : null}
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3 rounded-xl bg-secondary/45 p-5 text-center">
              <strong className="text-4xl font-semibold tracking-[-0.045em] text-ink tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </strong>
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-ink">{t("fasting.timer.currentZone")}</span>
                <strong className="text-sm text-ink">
                  {fasting.activeStartedAt ? t(currentStage.titleKey) : t("fasting.timer.notStarted")}
                </strong>
              </div>
              <Progress aria-label={t("fasting.target.label")} className="h-1.5" value={progress} />
              <p className="text-xs leading-relaxed text-muted-ink">
                {fasting.activeStartedAt
                  ? nextZoneStatus ? t("fasting.timer.statusWithNext", { status: targetStatus, next: nextZoneStatus }) : targetStatus
                  : t("fasting.timer.readyDescription")}
              </p>
            </div>

            {fasting.activeStartedAt ? (
              <Button onClick={() => void controller.endFasting()} type="button" variant="outline">
                <Square />
                {t("fasting.timer.end")}
              </Button>
            ) : (
              <Button onClick={() => void controller.startFasting(fasting.targetHours)} type="button">
                <Play />
                {t("fasting.timer.start")}
              </Button>
            )}

            <div className="grid gap-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <Target className="size-3.5 text-muted-ink" />
                  {t("fasting.target.label")}
                </span>
                <Badge variant="outline">{t("fasting.target.selectedHours", { hours: fasting.targetHours })}</Badge>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {targetOptions.map((hours) => (
                  <button
                    aria-pressed={fasting.targetHours === hours}
                    className={cn(
                      "min-h-9 rounded-lg border border-border/60 bg-canvas px-1 text-xs font-semibold text-muted-ink transition-colors duration-[var(--dur-feedback)] hover:bg-secondary hover:text-ink disabled:opacity-45",
                      fasting.targetHours === hours && "border-primary/40 bg-primary/10 text-primary",
                    )}
                    disabled={Boolean(fasting.activeStartedAt)}
                    key={hours}
                    onClick={() => void controller.setFastingTarget(hours)}
                    type="button"
                  >
                    {t("fasting.target.hours", { hours })}
                  </button>
                ))}
              </div>
              <details className="group rounded-lg border border-border/60 bg-canvas">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-ink hover:text-ink">
                  {t("fasting.target.custom")}
                </summary>
                <div className="flex gap-2 border-t border-border/60 p-2">
                  <Input
                    aria-label={t("fasting.target.custom")}
                    disabled={Boolean(fasting.activeStartedAt)}
                    max="72"
                    min="1"
                    onChange={(event) => setCustomHoursInput(event.target.value)}
                    placeholder={t("fasting.target.customPlaceholder")}
                    type="number"
                    value={customHoursInput}
                  />
                  <Button
                    disabled={Boolean(fasting.activeStartedAt) || !isValidFastingTarget(Number(customHoursInput))}
                    onClick={applyCustomTarget}
                    type="button"
                    variant="secondary"
                  >
                    {t("fasting.target.apply")}
                  </Button>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>

        <FastingStagesTimeline activeStartedAt={fasting.activeStartedAt} currentStage={currentStage} />
      </section>

      {recentSessions.length > 0 ? (
        <FastingHistory sessions={recentSessions} onDelete={(id) => void controller.deleteFastingSession(id)} />
      ) : null}
    </div>
  );
}
