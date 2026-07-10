export type BodyRegionKey = "head" | "neck" | "chest" | "upperArm" | "forearm" | "hand" | "abdomen" | "pelvis" | "thigh" | "knee" | "lowerLeg" | "foot";
export type BodyViewKey = "front" | "right" | "back" | "left";

export type BodyRegion = {
  region: BodyRegionKey;
  view: BodyViewKey;
  angle: number;
};

export function bodyRegionAt(x: number, y: number, angle: number): BodyRegion {
  const normalizedAngle = ((Math.round(angle) % 360) + 360) % 360;
  const view = normalizedAngle < 45 || normalizedAngle >= 315
    ? "front"
    : normalizedAngle < 135
      ? "right"
      : normalizedAngle < 225
        ? "back"
        : "left";
  const region = y < 15
    ? "head"
    : y < 22
      ? "neck"
      : y < 38
        ? (x < 20 || x > 80 ? "upperArm" : "chest")
        : y < 52
          ? (x < 17 || x > 83 ? "forearm" : "abdomen")
          : y < 59
            ? (x < 20 || x > 80 ? "hand" : "pelvis")
            : y < 74
              ? "thigh"
              : y < 82
                ? "knee"
                : y < 94
                  ? "lowerLeg"
                  : "foot";
  return { region, view, angle: normalizedAngle };
}
