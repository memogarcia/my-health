import { formatDate } from "../../dashboard-format";
import { t } from "../../i18n";
import { extent, linearScale, padDomain } from "../../charts/chart-scale";
import type { NumericLabSeries } from "../../charts/lab-series";

export function LabTrendChart({ series, height = 220 }: { series: NumericLabSeries; height?: number }) {
  const width = 640;
  const margin = { top: 18, right: 18, bottom: 34, left: 44 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const times = series.points.map((point) => Date.parse(`${point.measuredAt}T00:00:00`));
  const valueDomain = extent([
    ...series.points.map((point) => point.numericValue),
    ...(series.latest.referenceLow == null ? [] : [series.latest.referenceLow]),
    ...(series.latest.referenceHigh == null ? [] : [series.latest.referenceHigh]),
  ]) || [0, 1];
  const timeDomain = extent(times) || [0, 1];
  const xScale = linearScale(timeDomain[0] === timeDomain[1] ? [timeDomain[0] - 86400000, timeDomain[1] + 86400000] : timeDomain, [margin.left, margin.left + innerWidth]);
  const yScale = linearScale(padDomain(valueDomain), [margin.top + innerHeight, margin.top]);
  const path = series.points.map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(Date.parse(`${point.measuredAt}T00:00:00`)).toFixed(2)} ${yScale(point.numericValue).toFixed(2)}`).join(" ");
  const latest = series.latest;
  const previous = series.previous;
  const delta = previous ? latest.numericValue - previous.numericValue : null;
  const titleId = `lab-trend-title-${series.key.replace(/[^a-z0-9]/gi, "-")}`;
  const descId = `${titleId}-desc`;
  const hasReferenceBand = latest.referenceLow != null && latest.referenceHigh != null && latest.referenceHigh > latest.referenceLow;
  const refTop = hasReferenceBand ? yScale(latest.referenceHigh as number) : 0;
  const refBottom = hasReferenceBand ? yScale(latest.referenceLow as number) : 0;
  return (
    <div className="chart-content">
      <div className="chart-summary-grid">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("charts.lab.latest")}</p>
          <p className="text-lg font-semibold tnum">{latest.value} {latest.unit}</p>
          <p className="text-xs text-muted-foreground">{formatDate(latest.measuredAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("charts.lab.previous")}</p>
          <p className="text-lg font-semibold tnum">{delta == null ? "—" : t("charts.lab.deltaValue", { sign: delta > 0 ? "+" : "", value: formatNumber(delta), unit: latest.unit })}</p>
          {previous ? <p className="text-xs text-muted-foreground">{formatDate(previous.measuredAt)}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("charts.lab.referenceRange")}</p>
          <p className="text-sm font-medium">{latest.referenceRange || t("charts.lab.noReferenceRange")}</p>
          {series.hasMixedUnits || series.hasReferenceChanges ? <p className="text-xs text-muted-foreground">{series.hasMixedUnits ? t("charts.lab.unitsChanged") : t("charts.lab.referenceChanged")}</p> : null}
        </div>
      </div>
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{t("charts.lab.title")}: {series.marker}</title>
        <desc id={descId}>{t("charts.lab.description")}</desc>
        {[0, 0.5, 1].map((tick) => {
          const y = margin.top + innerHeight * tick;
          return <line className="chart-grid-line" key={tick} x1={margin.left} x2={width - margin.right} y1={y} y2={y} />;
        })}
        {hasReferenceBand ? <rect className="chart-reference-band" x={margin.left} y={refTop} width={innerWidth} height={Math.max(2, refBottom - refTop)} rx="6" /> : null}
        <path className="chart-trend-line" d={path} />
        {series.points.map((point) => {
          const latestPoint = point.id === latest.id;
          return <circle className={latestPoint ? `chart-point latest status-${latest.status}` : "chart-point"} cx={xScale(Date.parse(`${point.measuredAt}T00:00:00`))} cy={yScale(point.numericValue)} r={latestPoint ? 5 : 3.5} key={point.id} />;
        })}
        <g className="chart-axis">
          <text x={margin.left} y={height - 10}>{formatDate(series.points[0].measuredAt)}</text>
          <text x={width - margin.right} y={height - 10} textAnchor="end">{formatDate(latest.measuredAt)}</text>
        </g>
      </svg>
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
