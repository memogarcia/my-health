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
    <div className="grid gap-8 max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <Alert className="rounded-2xl border-primary/20 bg-primary/5 backdrop-blur-md">
        <AlertTriangle className="text-primary" />
        <AlertTitle className="text-ink">{t("breathing.title")}</AlertTitle>
        <AlertDescription className="text-muted-ink leading-relaxed">{t("breathing.description")}</AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3" role="group" aria-label={t("breathing.title")}>
        {techniques.map((technique) => (
          <button
            className={cn(
              "group flex flex-col items-start gap-3 rounded-2xl border border-border/50 bg-surface/40 p-5 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-surface/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              technique.id === selectedTechnique && "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]"
            )}
            type="button"
            key={technique.id}
            aria-pressed={technique.id === selectedTechnique}
            onClick={() => chooseTechnique(technique.id)}
          >
            <div className={cn(
              "grid size-10 place-items-center rounded-xl bg-canvas/60 shadow-inner transition-colors",
              technique.id === selectedTechnique ? "bg-primary/20 text-primary" : "text-muted-ink group-hover:text-ink"
            )}>
              <Wind aria-hidden="true" className="size-5" />
            </div>
            <div className="grid gap-1">
              <strong className={cn("text-base font-semibold tracking-tight transition-colors", technique.id === selectedTechnique ? "text-primary drop-shadow-sm" : "text-ink")}>{t(technique.titleKey)}</strong>
              <small className="text-sm leading-relaxed text-muted-ink/90">{t(technique.descriptionKey)}</small>
            </div>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden border border-border/60 bg-surface/60 shadow-lg backdrop-blur-xl rounded-3xl transition-all duration-500">
        <CardContent className="grid items-center gap-10 p-8 md:grid-cols-[0.85fr_1fr] md:gap-12 md:p-10">
          <div
            className={cn(
              "breathing-orb mx-auto flex flex-col items-center justify-center !border-border/30",
              `is-${phase.phaseKind}`,
              session.status !== "idle" && "is-started",
              session.status === "paused" && "is-paused",
              session.status === "complete" && "is-complete",
              phase.phaseKind === "hold" && `after-${previousPhase.phaseKind}`,
            )}
            key={`${selectedTechnique}-${session.completedCycles}-${session.phaseIndex}`}
            style={{ "--breath-phase": `${phase.seconds}s` } as CSSProperties}
          >
            <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_15px_rgba(0,0,0,0.05)] pointer-events-none"></div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary drop-shadow-sm">{t(phase.labelKey)}</span>
            <strong aria-hidden="true" className="mt-1 text-5xl font-semibold tracking-tighter text-ink tnum drop-shadow-sm">{remainingSeconds}</strong>
            <small className="mt-2 text-xs font-medium text-muted-ink">{t("breathing.secondsRemaining")}</small>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid gap-1.5">
              <strong className="text-2xl font-semibold tracking-tight text-ink drop-shadow-sm">{t(activeTechnique.titleKey)}</strong>
              <p className="text-sm leading-relaxed text-muted-ink">{t(activeTechnique.safetyKey)}</p>
            </div>
            
            <ol className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap m-0 p-0" aria-label={t("breathing.phaseSequence")}>
              {activeTechnique.phases.map((item, index) => (
                <li 
                  data-current={index === session.phaseIndex} 
                  key={`${item.labelKey}-${index}`}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border border-border/40 bg-surface/40 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-300",
                    index === session.phaseIndex && "scale-105 border-primary/30 bg-primary/10 shadow-md ring-1 ring-primary/20"
                  )}
                >
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", index === session.phaseIndex ? "text-primary drop-shadow-sm" : "text-muted-ink")}>{t(item.labelKey)}</span>
                  <small className={cn("text-sm font-medium tnum", index === session.phaseIndex ? "text-ink" : "text-muted-ink/80")}>{t("breathing.seconds", { seconds: item.seconds })}</small>
                </li>
              ))}
            </ol>
            
            {selectedTechnique === "wimHof" ? (
              <label className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-md cursor-pointer transition-colors hover:bg-primary/10">
                <Checkbox className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" checked={safetyAcknowledged} onCheckedChange={(checked) => setSafetyAcknowledged(checked === true)} />
                <span className="text-sm font-medium leading-relaxed text-ink/90">{t("breathing.wimHof.acknowledge")}</span>
              </label>
            ) : null}
            
            <p className="sr-only" role="status">{t("breathing.liveStatus", { phase: t(phase.labelKey), round: session.completedCycles + 1 })}</p>
            
            {session.status === "complete" ? (
              <p className="rounded-xl border border-status-normal/30 bg-status-normal/10 px-4 py-3 text-sm font-semibold text-status-normal backdrop-blur-md" role="status">
                {t("breathing.complete")}
              </p>
            ) : null}
            
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button 
                type="button" 
                size="lg"
                className={cn(
                  "rounded-xl font-medium shadow-md transition-all active:scale-95",
                  breathing ? "bg-surface text-ink hover:bg-surface/80 border border-border" : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={breathing ? () => setSession((current) => ({ ...current, status: "paused" })) : startBreathing} 
                disabled={selectedTechnique === "wimHof" && !safetyAcknowledged}
              >
                {breathing ? t("breathing.pause") : session.status === "paused" ? t("breathing.resume") : t("breathing.start")}
              </Button>
              {session.status !== "idle" ? (
                <Button type="button" variant="outline" className="rounded-xl border-border/60 bg-surface/40 font-medium backdrop-blur-sm transition-colors hover:bg-surface/80" onClick={() => setSession(createBreathingSession(activeTechnique.phases))}>
                  {t("breathing.reset")}
                </Button>
              ) : null}
              {session.status !== "idle" ? (
                <span className="ml-auto rounded-lg bg-canvas/50 px-3 py-1.5 text-sm font-medium text-muted-ink backdrop-blur-sm tnum">
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
