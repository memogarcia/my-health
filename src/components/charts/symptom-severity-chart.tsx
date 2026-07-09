import type { SymptomEntry } from "../../dashboard-model";
import { buildWeeklySymptomSeries } from "../../charts/symptom-series";
import { linearScale } from "../../charts/chart-scale";
import { formatDate } from "../../dashboard-format";
import { t } from "../../i18n";
import { ChartEmpty } from "./chart-empty";
import { ChartFrame } from "./chart-frame";

export function SymptomSeverityChart({ symptoms }: { symptoms: SymptomEntry[] }) {
  const points = buildWeeklySymptomSeries(symptoms);
  return (
    <ChartFrame title={t("charts.symptoms.title")} description={t("charts.symptoms.description")}>
      {points.length ? <SeverityBars points={points} /> : <ChartEmpty title={t("charts.symptoms.empty")} description={t("charts.symptoms.emptyDescription")} />}
    </ChartFrame>
  );
}

function SeverityBars({ points }: { points: ReturnType<typeof buildWeeklySymptomSeries> }) {
  const width = 640;
  const height = 160;
  const margin = { top: 12, right: 14, bottom: 32, left: 32 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const xStep = innerWidth / Math.max(1, points.length);
  const yScale = linearScale([0, 5], [margin.top + innerHeight, margin.top]);
  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("charts.symptoms.title")}>
      {[0, 2.5, 5].map((tick) => <line className="chart-grid-line" key={tick} x1={margin.left} x2={width - margin.right} y1={yScale(tick)} y2={yScale(tick)} />)}
      {points.map((point, index) => {
        const x = margin.left + index * xStep + xStep * 0.2;
        const barWidth = Math.max(6, xStep * 0.6);
        const y = yScale(point.maxSeverity);
        const status = point.maxSeverity >= 4 ? "attention" : point.maxSeverity >= 2 ? "monitor" : "normal";
        return (
          <g key={point.week}>
            <rect className={`chart-bar status-${status}`} x={x} y={y} width={barWidth} height={margin.top + innerHeight - y} rx="5" />
            <text className="chart-count-label" x={x + barWidth / 2} y={y - 5} textAnchor="middle">{point.count}</text>
          </g>
        );
      })}
      <g className="chart-axis">
        <text x={margin.left} y={height - 10}>{formatDate(points[0].week)}</text>
        <text x={width - margin.right} y={height - 10} textAnchor="end">{formatDate(points.at(-1)?.week || "")}</text>
      </g>
    </svg>
  );
}
