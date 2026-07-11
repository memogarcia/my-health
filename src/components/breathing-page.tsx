import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { advanceBreathingSession, createBreathingSession } from "../breathing-state";
import { t, type TranslationKey } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AlertTriangle, Wind } from "./health-icons";

type TechniqueId = "paced" | "box" | "wimHof";
type BreathPhase = { labelKey: TranslationKey; seconds: number; phaseKind: "inhale" | "hold" | "exhale" };
type Technique = { id: TechniqueId; titleKey: TranslationKey; descriptionKey: TranslationKey; safetyKey: TranslationKey; phases: BreathPhase[]; cycles?: number };

const techniques: Technique[] = [
  { id: "paced", titleKey: "breathing.paced.title", descriptionKey: "breathing.paced.description", safetyKey: "breathing.paced.safety", phases: [{ labelKey: "breathing.inhale", seconds: 4, phaseKind: "inhale" }, { labelKey: "breathing.exhale", seconds: 6, phaseKind: "exhale" }] },
  { id: "box", titleKey: "breathing.box.title", descriptionKey: "breathing.box.description", safetyKey: "breathing.box.safety", phases: [{ labelKey: "breathing.inhale", seconds: 4, phaseKind: "inhale" }, { labelKey: "breathing.hold", seconds: 4, phaseKind: "hold" }, { labelKey: "breathing.exhale", seconds: 4, phaseKind: "exhale" }, { labelKey: "breathing.hold", seconds: 4, phaseKind: "hold" }] },
  { id: "wimHof", titleKey: "breathing.wimHof.title", descriptionKey: "breathing.wimHof.description", safetyKey: "breathing.wimHof.safety", phases: [{ labelKey: "breathing.inhale", seconds: 2, phaseKind: "inhale" }, { labelKey: "breathing.exhale", seconds: 2, phaseKind: "exhale" }], cycles: 30 },
];

export function BreathingPage(_props: { controller: DashboardController }) {
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueId>("paced");
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [session, setSession] = useState(() => createBreathingSession(techniques[0].phases));
  const lastTick = useRef(0);
  const activeTechnique = techniques.find((technique) => technique.id === selectedTechnique) || techniques[0];
  const phase = activeTechnique.phases[session.phaseIndex] || activeTechnique.phases[0];
  const previousPhase = activeTechnique.phases[(session.phaseIndex - 1 + activeTechnique.phases.length) % activeTechnique.phases.length];
  const remainingSeconds = Math.max(0, Math.ceil(session.remainingMs / 1000));
  const breathing = session.status === "running";

  useEffect(() => {
    if (!breathing) return;
    lastTick.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - lastTick.current;
      lastTick.current = now;
      setSession((current) => advanceBreathingSession(current, activeTechnique.phases, activeTechnique.cycles, elapsedMs));
    }, 100);
    return () => window.clearInterval(timer);
  }, [activeTechnique, breathing]);

  function chooseTechnique(id: TechniqueId): void {
    const technique = techniques.find((item) => item.id === id) || techniques[0];
    setSelectedTechnique(technique.id);
    setSafetyAcknowledged(false);
    setSession(createBreathingSession(technique.phases));
  }

  function startBreathing(): void {
    if (selectedTechnique === "wimHof" && !safetyAcknowledged) return;
    setSession((current) => current.status === "paused"
      ? { ...current, status: "running" }
      : createBreathingSession(activeTechnique.phases, "running"));
  }

  return (
    <div className="breathing-page">
      <Alert>
        <AlertTriangle />
        <AlertTitle>{t("breathing.title")}</AlertTitle>
        <AlertDescription>{t("breathing.description")}</AlertDescription>
      </Alert>

      <div className="breathing-techniques" role="group" aria-label={t("breathing.title")}>
        {techniques.map((technique) => (
          <button
            className={cn("breathing-technique", technique.id === selectedTechnique && "is-selected")}
            type="button"
            key={technique.id}
            aria-pressed={technique.id === selectedTechnique}
            onClick={() => chooseTechnique(technique.id)}
          >
            <Wind aria-hidden="true" />
            <span>
              <strong>{t(technique.titleKey)}</strong>
              <small>{t(technique.descriptionKey)}</small>
            </span>
          </button>
        ))}
      </div>

      <Card className="breathing-practice">
        <CardContent className="breathing-practice-content">
          <div
            className={cn(
              "breathing-orb",
              `is-${phase.phaseKind}`,
              session.status !== "idle" && "is-started",
              session.status === "paused" && "is-paused",
              session.status === "complete" && "is-complete",
              phase.phaseKind === "hold" && `after-${previousPhase.phaseKind}`,
            )}
            key={`${selectedTechnique}-${session.completedCycles}-${session.phaseIndex}`}
            style={{ "--breath-phase": `${phase.seconds}s` } as CSSProperties}
          >
            <span>{t(phase.labelKey)}</span>
            <strong aria-hidden="true" className="tnum">{remainingSeconds}</strong>
            <small>{t("breathing.secondsRemaining")}</small>
          </div>

          <div className="breathing-practice-detail">
            <div>
              <strong>{t(activeTechnique.titleKey)}</strong>
              <p>{t(activeTechnique.safetyKey)}</p>
            </div>
            <ol className="breathing-phase-track" aria-label={t("breathing.phaseSequence")}>
              {activeTechnique.phases.map((item, index) => (
                <li data-current={index === session.phaseIndex} key={`${item.labelKey}-${index}`}>
                  <span>{t(item.labelKey)}</span>
                  <small className="tnum">{t("breathing.seconds", { seconds: item.seconds })}</small>
                </li>
              ))}
            </ol>
            {selectedTechnique === "wimHof" ? (
              <label className="breathing-safety-check">
                <Checkbox checked={safetyAcknowledged} onCheckedChange={(checked) => setSafetyAcknowledged(checked === true)} />
                <span>{t("breathing.wimHof.acknowledge")}</span>
              </label>
            ) : null}
            <p className="sr-only" role="status">{t("breathing.liveStatus", { phase: t(phase.labelKey), round: session.completedCycles + 1 })}</p>
            {session.status === "complete" ? <p className="breathing-complete" role="status">{t("breathing.complete")}</p> : null}
            <div className="breathing-practice-actions">
              <Button type="button" onClick={breathing ? () => setSession((current) => ({ ...current, status: "paused" })) : startBreathing} disabled={selectedTechnique === "wimHof" && !safetyAcknowledged}>
                {breathing ? t("breathing.pause") : session.status === "paused" ? t("breathing.resume") : t("breathing.start")}
              </Button>
              {session.status !== "idle" ? <Button type="button" variant="outline" onClick={() => setSession(createBreathingSession(activeTechnique.phases))}>{t("breathing.reset")}</Button> : null}
              {session.status !== "idle" ? (
                <span className="tnum breathing-round">
                  {t("breathing.round", { count: session.completedCycles + (session.status === "complete" ? 0 : 1), total: activeTechnique.cycles || "∞" })}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
