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
  const requestedTarget = typeof value?.targetHours === "number" && Number.isFinite(value.targetHours)
    ? Math.trunc(value.targetHours)
    : 16;
  const targetHours = [12, 14, 16, 18].includes(requestedTarget) ? requestedTarget : 16;
  return {
    activeStartedAt: validTimestamp(value?.activeStartedAt) ? value.activeStartedAt || "" : "",
    targetHours,
    sessions: Array.isArray(value?.sessions)
      ? value.sessions.map(normalizeFastingSession).filter(validSession).slice(0, 24)
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

function validSession(session: FastingSession): boolean {
  return Boolean(session.id)
    && validTimestamp(session.startedAt)
    && validTimestamp(session.endedAt)
    && Date.parse(session.endedAt) >= Date.parse(session.startedAt);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}
