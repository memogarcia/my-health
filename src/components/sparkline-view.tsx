import { seriesSparkline, type LabSeries } from "../sparkline";

// seriesSparkline returns SVG built only from fixed color constants (status
// hexes, CSS var tokens) and numeric coordinates, so the markup is safe to
// inject. Keep it that way: never pipe user-controlled strings (marker names,
// notes) into the SVG.
export function SparklineView({ series, className = "mini-spark" }: { series: LabSeries; className?: string }) {
  const svg = seriesSparkline(series, className);
  if (!svg) return <span className="text-sm text-muted-foreground">-</span>;
  return <span dangerouslySetInnerHTML={{ __html: svg }} />;
}
