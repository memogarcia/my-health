export type LinearScale = (value: number) => number;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function extent(values: number[]): [number, number] | null {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  return [Math.min(...finite), Math.max(...finite)];
}

export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

export function padDomain(domain: [number, number], ratio = 0.12): [number, number] {
  const [min, max] = domain;
  const span = max - min || Math.max(1, Math.abs(max));
  return [min - span * ratio, max + span * ratio];
}
