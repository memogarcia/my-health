export type BreathingPhaseTiming = { seconds: number };
export type BreathingSessionStatus = "idle" | "running" | "paused" | "complete";

export type BreathingSession = {
  phaseIndex: number;
  completedCycles: number;
  remainingMs: number;
  status: BreathingSessionStatus;
};

export function createBreathingSession(phases: BreathingPhaseTiming[], status: BreathingSessionStatus = "idle"): BreathingSession {
  return { phaseIndex: 0, completedCycles: 0, remainingMs: phaseDuration(phases, 0), status };
}

export function advanceBreathingSession(
  session: BreathingSession,
  phases: BreathingPhaseTiming[],
  cycleLimit: number | undefined,
  elapsedMs: number,
): BreathingSession {
  if (session.status !== "running" || !phases.length || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return session;
  let phaseIndex = session.phaseIndex;
  let completedCycles = session.completedCycles;
  let remainingMs = session.remainingMs - elapsedMs;

  while (remainingMs <= 0) {
    if (phaseIndex < phases.length - 1) {
      phaseIndex += 1;
    } else {
      completedCycles += 1;
      if (cycleLimit && completedCycles >= cycleLimit) {
        return { phaseIndex, completedCycles, remainingMs: 0, status: "complete" };
      }
      phaseIndex = 0;
    }
    remainingMs += phaseDuration(phases, phaseIndex);
  }

  return { phaseIndex, completedCycles, remainingMs, status: "running" };
}

function phaseDuration(phases: BreathingPhaseTiming[], index: number): number {
  const seconds = phases[index]?.seconds || 1;
  return Math.max(1, seconds) * 1000;
}
