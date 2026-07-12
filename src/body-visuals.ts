export type OrganVisual = {
  x: number;
  y: number;
};

const maleOrganVisuals: Record<string, OrganVisual> = {
  brain: { x: 50, y: 8 },
  thyroid: { x: 50, y: 27 },
  lungs: { x: 42, y: 42 },
  heart: { x: 52, y: 49 },
  liver: { x: 45, y: 59 },
  spleen: { x: 60, y: 64 },
  stomach: { x: 56, y: 65 },
  pancreas: { x: 51, y: 68 },
  kidneys: { x: 43, y: 70 },
  intestines: { x: 50, y: 81 },
  bladder: { x: 50, y: 94 },
};

const femaleOrganVisuals: Record<string, OrganVisual> = {
  brain: { x: 50, y: 8 },
  thyroid: { x: 50, y: 29 },
  lungs: { x: 42, y: 43 },
  heart: { x: 52, y: 50 },
  liver: { x: 45, y: 61 },
  spleen: { x: 60, y: 65 },
  stomach: { x: 56, y: 66 },
  pancreas: { x: 51, y: 69 },
  kidneys: { x: 43, y: 71 },
  intestines: { x: 50, y: 82 },
  bladder: { x: 50, y: 95 },
};

export function getOrganVisual(key: string, model: "male" | "female" = "male"): OrganVisual | undefined {
  return (model === "female" ? femaleOrganVisuals : maleOrganVisuals)[key];
}
