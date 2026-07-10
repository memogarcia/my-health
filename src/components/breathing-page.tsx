import { useEffect, useState, type CSSProperties } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCycles, setBreathCycles] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const activeTechnique = techniques.find((technique) => technique.id === selectedTechnique) || techniques[0];
  const phase = activeTechnique.phases[breathPhase] || activeTechnique.phases[0];

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
    <div className="breathing-page">
      <Alert>
        <AlertTriangle />
        <AlertTitle>{t("breathing.title")}</AlertTitle>
        <AlertDescription>{t("breathing.description")}</AlertDescription>
      </Alert>

      <div className="breathing-techniques" role="tablist" aria-label={t("breathing.title")}>
        {techniques.map((technique) => (
          <button
            className={cn("breathing-technique", technique.id === selectedTechnique && "is-selected")}
            type="button"
            key={technique.id}
            role="tab"
            aria-selected={technique.id === selectedTechnique}
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
            className={cn("breathing-orb", `is-${phase.phaseKind}`, breathing && "is-active")}
            aria-live="polite"
            style={{ "--breath-phase": phase.seconds } as CSSProperties}
          >
            <span>{t(phase.labelKey)}</span>
            <strong className="tnum">{phase.seconds}</strong>
          </div>

          <div className="breathing-practice-detail">
            <div>
              <strong>{t(activeTechnique.titleKey)}</strong>
              <p>{t(activeTechnique.safetyKey)}</p>
            </div>
            {selectedTechnique === "wimHof" ? (
              <label className="breathing-safety-check">
                <Checkbox checked={safetyAcknowledged} onCheckedChange={(checked) => setSafetyAcknowledged(checked === true)} />
                <span>{t("breathing.wimHof.acknowledge")}</span>
              </label>
            ) : null}
            <div className="breathing-practice-actions">
              <Button type="button" onClick={breathing ? () => setBreathing(false) : startBreathing}>
                {breathing ? t("breathing.pause") : t("breathing.start")}
              </Button>
              {breathing ? (
                <span className="tnum breathing-round">
                  {t("breathing.round", { count: breathCycles + 1, total: activeTechnique.cycles || "∞" })}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
