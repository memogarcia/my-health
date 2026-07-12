export type Challenge = {
  id: string;
  title: string;
  description: string;
  measure: string;
  startDate: string;
  endDate: string;
  completed: boolean;
  createdAt: string;
};

export function normalizeChallenge(entry: Partial<Challenge>): Challenge {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    title: typeof entry.title === "string" ? limitText(entry.title.trim(), 120) : "",
    description: typeof entry.description === "string" ? limitText(entry.description.trim(), 800) : "",
    measure: typeof entry.measure === "string" ? limitText(entry.measure.trim(), 240) : "",
    startDate: typeof entry.startDate === "string" ? entry.startDate : "",
    endDate: typeof entry.endDate === "string" ? entry.endDate : "",
    completed: entry.completed === true,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
  };
}

function limitText(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}
