import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { t, type TranslationKey } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AlertTriangle, Check, Timer, Wind } from "./health-icons";

type TechniqueId = "paced" | "box" | "wimHof";
type BreathPhase = { labelKey: TranslationKey; seconds: number; phaseKind: "inhale" | "hold" | "exhale" };
type Technique = { id: TechniqueId; titleKey: TranslationKey; descriptionKey: TranslationKey; safetyKey: TranslationKey; phases: BreathPhase[]; cycles?: number };

const stages: Array<{ hours: number; titleKey: TranslationKey; descriptionKey: TranslationKey }> = [
  { hours: 0, titleKey: "fasting.stage.0.title", descriptionKey: "fasting.stage.0.description" },
  { hours: 4, titleKey: "fasting.stage.4.title", descriptionKey: "fasting.stage.4.description" },
  { hours: 8, titleKey: "fasting.stage.8.title", descriptionKey: "fasting.stage.8.description" },
  { hours: 12, titleKey: "fasting.stage.12.title", descriptionKey: "fasting.stage.12.description" },
  { hours: 16, titleKey: "fasting.stage.16.title", descriptionKey: "fasting.stage.16.description" },
  { hours: 18, titleKey: "fasting.stage.18.title", descriptionKey: "fasting.stage.18.description" },
];

const techniques: Technique[] = [
  { id: "paced", titleKey: "fasting.breathing.paced.title", descriptionKey: "fasting.breathing.paced.description", safetyKey: "fasting.breathing.paced.safety", phases: [{ labelKey: "fasting.breathing.inhale", seconds: 4, phaseKind: "inhale" }, { labelKey: "fasting.breathing.exhale", seconds: 6, phaseKind: "exhale" }] },
  { id: "box", titleKey: "fasting.breathing.box.title", descriptionKey: "fasting.breathing.box.description", safetyKey: "fasting.breathing.box.safety", phases: [{ labelKey: "fasting.breathing.inhale", seconds: 4, phaseKind: "inhale" }, { labelKey: "fasting.breathing.hold", seconds: 4, phaseKind: "hold" }, { labelKey: "fasting.breathing.exhale", seconds: 4, phaseKind: "exhale" }, { labelKey: "fasting.breathing.hold", seconds: 4, phaseKind: "hold" }] },
  { id: "wimHof", titleKey: "fasting.breathing.wimHof.title", descriptionKey: "fasting.breathing.wimHof.description", safetyKey: "fasting.breathing.wimHof.safety", phases: [{ labelKey: "fasting.breathing.inhale", seconds: 2, phaseKind: "inhale" }, { labelKey: "fasting.breathing.exhale", seconds: 2, phaseKind: "exhale" }], cycles: 30 },
];

export function FastingPage({ controller }: { controller: DashboardController }) {
  const [now, setNow] = useState(Date.now());
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueId>("paced");
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCycles, setBreathCycles] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const fasting = controller.userState.fasting;
  const activeTechnique = techniques.find((technique) => technique.id === selectedTechnique) || techniques[0];
  const elapsedSeconds = fasting.activeStartedAt ? Math.max(0, Math.floor((now - Date.parse(fasting.activeStartedAt)) / 1000)) : 0;
  const elapsedHours = elapsedSeconds / 3600;
  const currentStage = [...stages].reverse().find((stage) => elapsedHours >= stage.hours) || stages[0];
  const progress = Math.min(1, elapsedHours / fasting.targetHours);
  const phase = activeTechnique.phases[breathPhase] || activeTechnique.phases[0];

  useEffect(() => {
    if (!fasting.activeStartedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [fasting.activeStartedAt]);

  useEffect(() => {
    if (!breathing) return;
    const timer = window.setTimeout(() => {
      setBreathPhase((current) => {
        if (current < activeTechnique.phases.length - 1) return current + 1;
        setBreathCycles((cycles) => {
          const next = cycles + 1;
          if (activeTechnique.cycles && next >= activeTechnique.cycles) setBreathing(false);
          return next;
        });
        return 0;
      });
    }, phase.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [activeTechnique, breathing, phase.seconds]);

  const recentSessions = useMemo(() => fasting.sessions.slice(0, 3), [fasting.sessions]);

  function chooseTechnique(id: TechniqueId): void {
    setSelectedTechnique(id);
    setBreathPhase(0);
    setBreathCycles(0);
    setBreathing(false);
  }

  function startBreathing(): void {
    if (selectedTechnique === "wimHof" && !safetyAcknowledged) return;
    setBreathPhase(0);
    setBreathCycles(0);
    setBreathing(true);
  }

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
            <div className="fasting-orbit" style={{ "--fasting-progress": progress } as CSSProperties} aria-live="polite">
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
              <p className="fasting-stage-label">{t(currentStage.titleKey)}</p>
              <p className="text-sm text-muted-foreground">{t(currentStage.descriptionKey)}</p>
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
              {stages.map((stage) => (
                <li className={stage.hours === currentStage.hours ? "is-current" : ""} key={stage.hours}>
                  <span className="tnum">{t("fasting.stage.hour", { hours: stage.hours })}</span>
                  <div><strong>{t(stage.titleKey)}</strong><p>{t(stage.descriptionKey)}</p></div>
                  {stage.hours === currentStage.hours ? <Check aria-label={t("fasting.stage.current")} /> : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="fasting-breathwork" aria-labelledby="fasting-breathwork-title">
        <div><h2 id="fasting-breathwork-title">{t("fasting.breathing.title")}</h2><p>{t("fasting.breathing.description")}</p></div>
        <div className="fasting-technique-list">
          {techniques.map((technique) => (
            <button className={technique.id === selectedTechnique ? "is-selected" : ""} type="button" key={technique.id} aria-pressed={technique.id === selectedTechnique} onClick={() => chooseTechnique(technique.id)}>
              <Wind aria-hidden="true" /><strong>{t(technique.titleKey)}</strong><span>{t(technique.descriptionKey)}</span>
            </button>
          ))}
        </div>
        <Card className="breathing-guide-card">
          <CardContent className="breathing-guide-content">
            <div className={`breathing-orb is-${phase.phaseKind} ${breathing ? "is-active" : ""}`} aria-live="polite"><span>{t(phase.labelKey)}</span><strong>{phase.seconds}</strong></div>
            <div className="grid gap-2">
              <div><strong>{t(activeTechnique.titleKey)}</strong><p className="text-sm text-muted-foreground">{t(activeTechnique.safetyKey)}</p></div>
              {selectedTechnique === "wimHof" ? <label className="fasting-safety-check"><Checkbox checked={safetyAcknowledged} onCheckedChange={(checked) => setSafetyAcknowledged(checked === true)} /><span>{t("fasting.breathing.wimHof.acknowledge")}</span></label> : null}
              <div className="flex flex-wrap gap-2"><Button type="button" onClick={breathing ? () => setBreathing(false) : startBreathing}>{breathing ? t("fasting.breathing.pause") : t("fasting.breathing.start")}</Button>{breathing ? <span className="self-center text-xs text-muted-foreground tnum">{t("fasting.breathing.round", { count: breathCycles + 1, total: activeTechnique.cycles || "∞" })}</span> : null}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {recentSessions.length ? <section className="fasting-history" aria-labelledby="fasting-history-title"><h2 id="fasting-history-title">{t("fasting.history.title")}</h2><ol>{recentSessions.map((session) => <li key={session.id}><span className="tnum">{formatElapsed(Math.max(0, Math.floor((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000)))}</span><span>{t("fasting.history.target", { hours: session.targetHours })}</span></li>)}</ol></section> : null}
    </div>
  );
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
