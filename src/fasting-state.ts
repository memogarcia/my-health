export type FastingSession = {
  id: string;
  startedAt: string;
  endedAt: string;
  targetHours: number;
};

export type FastingState = {
  activeStartedAt: string;
  targetHours: number;
  sessions: FastingSession[];
};

export function normalizeFastingState(value: Partial<FastingState> | undefined): FastingState {
  const targetHours = typeof value?.targetHours === "number" && Number.isFinite(value.targetHours)
    ? Math.min(24, Math.max(12, Math.trunc(value.targetHours)))
    : 16;
  return {
    activeStartedAt: typeof value?.activeStartedAt === "string" ? value.activeStartedAt : "",
    targetHours,
    sessions: Array.isArray(value?.sessions)
      ? value.sessions.map(normalizeFastingSession).filter((session) => session.id && session.startedAt && session.endedAt).slice(0, 24)
      : [],
  };
}

function normalizeFastingSession(session: Partial<FastingSession>): FastingSession {
  return {
    id: typeof session.id === "string" ? session.id : "",
    startedAt: typeof session.startedAt === "string" ? session.startedAt : "",
    endedAt: typeof session.endedAt === "string" ? session.endedAt : "",
    targetHours: typeof session.targetHours === "number" && Number.isFinite(session.targetHours)
      ? Math.min(24, Math.max(12, Math.trunc(session.targetHours)))
      : 16,
  };
}
