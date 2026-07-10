export type BodyNote = { id: string; area: string; angle: number; x: number; y: number; note: string; createdAt: string };

export function normalizeBodyNote(entry: Partial<BodyNote>): BodyNote {
  return { id: typeof entry.id === "string" ? entry.id : "", area: typeof entry.area === "string" ? entry.area.slice(0, 80) : "", angle: typeof entry.angle === "number" && Number.isFinite(entry.angle) ? Math.round(entry.angle % 360) : 0, x: typeof entry.x === "number" && Number.isFinite(entry.x) ? Math.min(100, Math.max(0, entry.x)) : 50, y: typeof entry.y === "number" && Number.isFinite(entry.y) ? Math.min(100, Math.max(0, entry.y)) : 50, note: typeof entry.note === "string" ? entry.note.slice(0, 32_000) : "", createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "" };
}
