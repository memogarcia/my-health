import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { advanceBreathingSession, createBreathingSession } from "@/breathing-state";
import { t, type TranslationKey } from "@/i18n";
import type { DashboardController } from "@/use-dashboard-controller";

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
    setSession((current) => current.status === "paused" ? { ...current, status: "running" } : createBreathingSession(activeTechnique.phases, "running"));
  }

  function resetBreathing(): void {
    setSession(createBreathingSession(activeTechnique.phases));
  }

  return (
    <div className="mx-auto grid w-full max-w-[960px] gap-6 px-8 py-7 max-[880px]:px-5">
      <header className="border-b border-border/55 pb-5">
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">{t("breathing.title")}</h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-muted-ink">{t("breathing.description")}</p>
      </header>

      <div className="grid grid-cols-3 rounded-xl bg-secondary p-1" role="group" aria-label={t("breathing.title")}>
        {techniques.map((technique) => (
          <button aria-pressed={technique.id === selectedTechnique} className="grid min-h-[54px] rounded-lg px-3 py-2 text-left text-muted-ink transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[var(--elev-1)]" key={technique.id} onClick={() => chooseTechnique(technique.id)} type="button">
            <strong className="text-xs font-semibold">{t(technique.titleKey)}</strong>
            <small className="mt-0.5 text-[11px] leading-snug text-muted-ink">{t(technique.descriptionKey)}</small>
          </button>
        ))}
      </div>

      <section className="grid items-center gap-8 rounded-xl bg-surface px-7 py-8 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]" aria-label={t(activeTechnique.titleKey)}>
        <div className={cn("breathing-orb", `is-${phase.phaseKind}`, session.status !== "idle" && "is-started", session.status === "paused" && "is-paused", session.status === "complete" && "is-complete", phase.phaseKind === "hold" && `after-${previousPhase.phaseKind}`)} key={`${selectedTechnique}-${session.completedCycles}-${session.phaseIndex}`} style={{ "--breath-phase": `${phase.seconds}s` } as CSSProperties}>
          <span>{t(phase.labelKey)}</span>
          <strong aria-hidden="true">{remainingSeconds}</strong>
          <small>{t("breathing.secondsRemaining")}</small>
        </div>

        <div className="grid gap-5">
          <div>
            <div className="flex items-center gap-2"><Wind className="size-4 text-primary" /><h2 className="text-base font-semibold text-ink">{t(activeTechnique.titleKey)}</h2></div>
            <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-muted-ink">{t(activeTechnique.safetyKey)}</p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-2" aria-label={t("breathing.phaseSequence")}>
            {activeTechnique.phases.map((item, index) => (
              <li className="rounded-lg bg-secondary px-3 py-2 text-muted-ink data-[current=true]:bg-accent data-[current=true]:text-accent-ink" data-current={index === session.phaseIndex} key={`${item.labelKey}-${index}`}>
                <span className="block text-xs font-semibold">{t(item.labelKey)}</span>
                <small className="text-[11px] tabular-nums">{t("breathing.seconds", { seconds: item.seconds })}</small>
              </li>
            ))}
          </ol>
          {selectedTechnique === "wimHof" ? (
            <label className="flex items-start gap-2.5 rounded-lg bg-monitor/8 p-3 text-xs leading-relaxed text-muted-ink">
              <Checkbox className="mt-0.5" checked={safetyAcknowledged} onCheckedChange={(checked) => setSafetyAcknowledged(checked === true)} />
              <span>{t("breathing.wimHof.acknowledge")}</span>
            </label>
          ) : null}
          <p className="sr-only" role="status">{t("breathing.liveStatus", { phase: t(phase.labelKey), round: session.completedCycles + 1 })}</p>
          {session.status === "complete" ? <p className="rounded-lg bg-normal/10 px-3 py-2.5 text-xs font-semibold text-normal" role="status">{t("breathing.complete")}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={selectedTechnique === "wimHof" && !safetyAcknowledged} onClick={breathing ? () => setSession((current) => ({ ...current, status: "paused" })) : startBreathing} type="button">
              {breathing ? <Pause /> : <Play />}{breathing ? t("breathing.pause") : session.status === "paused" ? t("breathing.resume") : t("breathing.start")}
            </Button>
            <Button onClick={resetBreathing} type="button" variant="ghost"><RotateCcw />{t("breathing.reset")}</Button>
            {activeTechnique.cycles ? <span className="ml-auto text-xs tabular-nums text-muted-ink">{t("breathing.round", { count: Math.min(activeTechnique.cycles, session.completedCycles + 1), total: activeTechnique.cycles })}</span> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
