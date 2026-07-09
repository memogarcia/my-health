import type { AppleHealthImport, LabReport } from "../../dashboard-model";
import { formatDate } from "../../dashboard-format";
import { extent, linearScale } from "../../charts/chart-scale";
import { t } from "../../i18n";
import { ChartEmpty } from "./chart-empty";
import { ChartFrame } from "./chart-frame";

type CoverageSpan = { id: string; label: string; start: string; end: string; meta: string; pointOnly?: boolean };

export function ImportCoverageTimeline({ imports, reports = [] }: { imports: AppleHealthImport[]; reports?: LabReport[] }) {
  const spans: CoverageSpan[] = [
    ...imports.filter((item) => dateOnly(item.startedAt) && dateOnly(item.endedAt)).map((item) => ({
      id: item.id,
      label: item.sourceName,
      start: dateOnly(item.startedAt) as string,
      end: dateOnly(item.endedAt) as string,
      meta: t("charts.documents.appleHealthMeta", { records: item.recordCount, workouts: item.workoutCount, imported: formatDate(item.importedAt) }),
    })),
    ...reports.map((report) => {
      const createdAt = dateOnly(report.createdAt) || report.createdAt;
      return {
        id: `report-${report.id}`,
        label: report.sourceName,
        start: createdAt,
        end: createdAt,
        meta: t("charts.documents.reportMeta", { count: report.resultCount, imported: formatDate(report.createdAt) }),
        pointOnly: true,
      };
    }),
  ];
  return (
    <ChartFrame title={t("charts.documents.coverageTitle")} description={t("charts.documents.coverageDescription")}>
      {spans.length ? <CoverageRows spans={spans} /> : <ChartEmpty title={t("charts.documents.empty")} description={t("charts.documents.emptyDescription")} />}
    </ChartFrame>
  );
}

function dateOnly(value: string): string | null {
  return /^(\d{4}-\d{2}-\d{2})/u.exec(value)?.[1] || null;
}

function CoverageRows({ spans }: { spans: CoverageSpan[] }) {
  const domain = extent(spans.flatMap((span) => [Date.parse(`${span.start}T00:00:00`), Date.parse(`${span.end}T00:00:00`)])) || [0, 1];
  const scale = linearScale(domain[0] === domain[1] ? [domain[0] - 86400000, domain[1] + 86400000] : domain, [0, 100]);
  return (
    <div className="timeline-list">
      {spans.map((span) => {
        const left = scale(Date.parse(`${span.start}T00:00:00`));
        const right = scale(Date.parse(`${span.end}T00:00:00`));
        return (
          <div className="timeline-row" key={span.id}>
            <div className="min-w-0"><strong className="block truncate">{span.label}</strong><small className="text-muted-foreground">{span.meta}</small></div>
            <div className="timeline-track" aria-label={t("charts.documents.dateRange", { start: formatDate(span.start), end: formatDate(span.end) })}>
              <span className={span.pointOnly ? "timeline-dot" : "timeline-bar active"} style={span.pointOnly ? { left: `${left}%` } : { left: `${Math.min(left, right)}%`, width: `${Math.max(2, Math.abs(right - left))}%` }} />
            </div>
            <small className="text-right text-muted-foreground">{span.pointOnly ? formatDate(span.start) : t("charts.documents.dateRange", { start: formatDate(span.start), end: formatDate(span.end) })}</small>
          </div>
        );
      })}
    </div>
  );
}
