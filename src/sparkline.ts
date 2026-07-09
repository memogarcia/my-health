import type { HealthStatus, LabResult } from "./dashboard-model";

// Single source of truth for status colors. Mirrors the --status-* tokens in
// styles.css so sparklines, dots, meters, and badges never drift apart.
const STATUS_HEX: Record<HealthStatus, string> = {
  normal: "#1c7259",
  monitor: "#9a540f",
  attention: "#b64235",
};

export function statusHex(status: HealthStatus): string {
  return STATUS_HEX[status];
}

// Trend lines stay in a neutral de-emphasis hue; the latest-point dot carries
// the status color. Coloring the whole history line by the latest status would
// misstate older readings. Resolved from the --trend-line token at render time
// because the SVG is injected inline into the DOM.
const TREND_LINE = "var(--trend-line)";
const SURFACE = "var(--card)";

/**
 * Parse a lab value string to a representative number. Plain numbers return
 * directly; composite values like a blood pressure reading average to their
 * mean; values with a leading comparator use the trailing number. Returns null
 * when no numeric content is present.
 */
export function parseLabNumber(value: string): number | null {
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return nums.reduce((total, n) => total + n, 0) / nums.length;
}

export type LabSeries = {
  marker: string;
  unit: string;
  status: HealthStatus;
  points: LabResult[];
};

/** Group labs into per-marker series, each sorted oldest -> newest. */
export function groupByMarker(labs: LabResult[]): LabSeries[] {
  const map = new Map<string, LabResult[]>();
  for (const lab of labs) {
    const list = map.get(lab.marker);
    if (list) {
      list.push(lab);
    } else {
      map.set(lab.marker, [lab]);
    }
  }

  const series: LabSeries[] = [];
  for (const [marker, points] of map) {
    const sorted = [...points].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
    const latest = sorted[sorted.length - 1];
    series.push({ marker, unit: latest.unit, status: latest.status, points: sorted });
  }
  return series.sort((a, b) => {
    const aLast = a.points[a.points.length - 1].measuredAt;
    const bLast = b.points[b.points.length - 1].measuredAt;
    return bLast.localeCompare(aLast);
  });
}

let gradientSeed = 0;

/**
 * Render an SVG sparkline from numeric values. Stretches to its CSS box via
 * preserveAspectRatio="none"; stroke stays crisp through vector-effect. The
 * latest point is marked with a dot in dotColor over a surface-colored ring.
 */
export function sparklineSvg(values: number[], color: string, cls = "mini-spark", dotColor = color): string {
  if (values.length === 0) return "";
  const width = 100;
  const height = 40;
  const pad = 4;
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xAt = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * (width - pad * 2) + pad);
  const yAt = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const coords = values.map((v, i) => [xAt(i), yAt(v)] as const);
  const last = coords[coords.length - 1];
  const fmt = (n: number) => n.toFixed(1);
  const endDot = `<circle cx="${fmt(last[0])}" cy="${fmt(last[1])}" r="2.5" fill="${dotColor}" stroke="${SURFACE}" stroke-width="1.5" vector-effect="non-scaling-stroke" />`;

  if (n === 1) {
    return `<svg class="${cls}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><line x1="${pad}" y1="${fmt(last[1])}" x2="${width - pad}" y2="${fmt(last[1])}" stroke="${color}" stroke-width="2" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity="0.45" />${endDot}</svg>`;
  }

  const line = coords.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${fmt(width - pad)},${height - pad}`;
  const id = `spark-${(gradientSeed += 1)}`;
  return `<svg class="${cls}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.14" /><stop offset="1" stop-color="${color}" stop-opacity="0" /></linearGradient></defs><polygon points="${area}" fill="url(#${id})" /><polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />${endDot}</svg>`;
}

/** Build a sparkline for a marker series: neutral line, status-colored end dot. */
export function seriesSparkline(series: LabSeries, cls = "mini-spark"): string {
  const values = series.points.map((point) => parseLabNumber(point.value)).filter((value): value is number => value != null);
  if (values.length === 0) return "";
  return sparklineSvg(values, TREND_LINE, cls, statusHex(series.status));
}

export type TrendSummary = { trendable: number; top: LabSeries | null };

/** Count markers with >= 2 numeric readings and surface the longest series. */
export function trendSummary(labs: LabResult[]): TrendSummary {
  const series = groupByMarker(labs);
  const trendable = series.filter((s) => s.points.filter((point) => parseLabNumber(point.value) != null).length >= 2);
  const top = trendable.slice().sort((a, b) => b.points.length - a.points.length)[0] ?? null;
  return { trendable: trendable.length, top };
}
