import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t, type TranslationKey } from "../i18n";
import { formatDate } from "../dashboard-format";
import type { DashboardController } from "../use-dashboard-controller";
import { AlertTriangle, Check, Timer } from "./health-icons";

const stages: Array<{ hours: number; titleKey: TranslationKey; descriptionKey: TranslationKey }> = [
  { hours: 0, titleKey: "fasting.stage.0.title", descriptionKey: "fasting.stage.0.description" },
  { hours: 4, titleKey: "fasting.stage.4.title", descriptionKey: "fasting.stage.4.description" },
  { hours: 8, titleKey: "fasting.stage.8.title", descriptionKey: "fasting.stage.8.description" },
  { hours: 12, titleKey: "fasting.stage.12.title", descriptionKey: "fasting.stage.12.description" },
  { hours: 16, titleKey: "fasting.stage.16.title", descriptionKey: "fasting.stage.16.description" },
  { hours: 18, titleKey: "fasting.stage.18.title", descriptionKey: "fasting.stage.18.description" },
];

export function FastingPage({ controller }: { controller: DashboardController }) {
  const [now, setNow] = useState(Date.now());
  const fasting = controller.userState.fasting;
  const elapsedSeconds = fasting.activeStartedAt ? Math.max(0, Math.floor((now - Date.parse(fasting.activeStartedAt)) / 1000)) : 0;
  const elapsedHours = elapsedSeconds / 3600;
  const currentStage = [...stages].reverse().find((stage) => elapsedHours >= stage.hours) || stages[0];
  const progress = fasting.activeStartedAt ? Math.min(1, elapsedHours / fasting.targetHours) : 0;
  const targetRemainingSeconds = Math.max(0, Math.ceil(fasting.targetHours * 3600 - elapsedSeconds));
  const nextStage = stages.find((stage) => stage.hours > elapsedHours);
  const targetStatus = targetRemainingSeconds === 0
    ? t("fasting.timer.targetReached")
    : t("fasting.timer.remaining", { time: formatCompactDuration(targetRemainingSeconds) });
  const nextZoneStatus = nextStage && nextStage.hours <= fasting.targetHours
    ? t("fasting.timer.nextZone", { zone: t(nextStage.titleKey), time: formatCompactDuration(Math.max(0, Math.ceil(nextStage.hours * 3600 - elapsedSeconds))) })
    : "";

  useEffect(() => {
    if (!fasting.activeStartedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [fasting.activeStartedAt]);

  const recentSessions = useMemo(() => fasting.sessions.slice(0, 5), [fasting.sessions]);

  return (
    <div className="fasting-page">
      <Alert>
        <AlertTriangle />
        <AlertTitle>{t("fasting.safety.title")}</AlertTitle>
        <AlertDescription>{t("fasting.safety.description")}</AlertDescription>
      </Alert>
      <section className="fasting-dashboard" aria-label={t("fasting.timer.label")}>
        <Card className="fasting-timer-card">
          <CardHeader>
            <CardTitle>{t("fasting.timer.title")}</CardTitle>
          </CardHeader>
          <CardContent className="fasting-timer-content">
            <div className="fasting-orbit" data-complete={progress >= 1} style={{ "--fasting-progress": progress } as CSSProperties}>
              <Timer aria-hidden="true" />
              <strong className="tnum">{formatElapsed(elapsedSeconds)}</strong>
              <span>{fasting.activeStartedAt ? t("fasting.timer.inProgress") : t("fasting.timer.ready")}</span>
            </div>
            <div className="fasting-controls">
              <div className="fasting-targets" aria-label={t("fasting.target.label")}>
                {[12, 14, 16, 18].map((hours) => (
                  <Button key={hours} type="button" size="sm" variant={fasting.targetHours === hours ? "default" : "outline"} disabled={Boolean(fasting.activeStartedAt)} onClick={() => void controller.setFastingTarget(hours)}>
                    {t("fasting.target.hours", { hours })}
                  </Button>
                ))}
              </div>
              <div className="fasting-zone-summary">
                <span>{t("fasting.timer.currentZone")}</span>
                <strong>{fasting.activeStartedAt ? t(currentStage.titleKey) : t("fasting.timer.notStarted")}</strong>
                <p>{fasting.activeStartedAt ? t(currentStage.descriptionKey) : t("fasting.timer.readyDescription")}</p>
              </div>
              {fasting.activeStartedAt ? (
                <p className="fasting-target-status" role="status">
                  {nextZoneStatus ? t("fasting.timer.statusWithNext", { status: targetStatus, next: nextZoneStatus }) : targetStatus}
                </p>
              ) : null}
              {fasting.activeStartedAt ? (
                <Button type="button" variant="outline" onClick={() => void controller.endFasting()}>{t("fasting.timer.end")}</Button>
              ) : (
                <Button type="button" onClick={() => void controller.startFasting(fasting.targetHours)}>{t("fasting.timer.start")}</Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="fasting-stages-card">
          <CardHeader><CardTitle>{t("fasting.stages.title")}</CardTitle></CardHeader>
          <CardContent>
            <ol className="fasting-stage-list">
              {stages.map((stage, index) => {
                const next = stages[index + 1];
                const state = !fasting.activeStartedAt ? "upcoming" : stage.hours === currentStage.hours ? "current" : stage.hours < currentStage.hours ? "passed" : "upcoming";
                return (
                <li data-state={state} key={stage.hours}>
                  <span className="tnum">{next ? t("fasting.stage.range", { start: stage.hours, end: next.hours }) : t("fasting.stage.rangePlus", { hours: stage.hours })}</span>
                  <div><strong>{t(stage.titleKey)}</strong><p>{t(stage.descriptionKey)}</p></div>
                  {state === "current" ? <Check aria-label={t("fasting.stage.current")} /> : null}
                </li>
              );})}
            </ol>
            <p className="fasting-variability-note">{t("fasting.stages.variability")}</p>
          </CardContent>
        </Card>
      </section>

      {recentSessions.length ? <section className="fasting-history" aria-labelledby="fasting-history-title"><h2 id="fasting-history-title">{t("fasting.history.title")}</h2><ol>{recentSessions.map((session) => <li key={session.id}><span><strong className="tnum">{formatElapsed(Math.max(0, Math.floor((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000)))}</strong><small>{formatDate(session.startedAt)}</small></span><span>{t("fasting.history.target", { hours: session.targetHours })}</span><Button aria-label={t("fasting.history.deleteLabel", { date: formatDate(session.startedAt) })} onClick={() => { if (window.confirm(t("fasting.history.deleteConfirm"))) void controller.deleteFastingSession(session.id); }} size="icon-xs" type="button" variant="destructive"><Trash2 /></Button></li>)}</ol></section> : null}
    </div>
  );
}

function formatCompactDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.ceil((totalSeconds % 3600) / 60);
  if (hours === 0) return t("fasting.timer.minutes", { minutes });
  if (minutes === 0 || minutes === 60) return t("fasting.timer.hours", { hours: hours + (minutes === 60 ? 1 : 0) });
  return t("fasting.timer.hoursMinutes", { hours, minutes });
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
