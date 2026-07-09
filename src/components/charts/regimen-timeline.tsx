import type { RegimenItem } from "../../dashboard-model";
import { formatDate, todayString } from "../../dashboard-format";
import { extent, linearScale } from "../../charts/chart-scale";
import { t } from "../../i18n";
import { ChartEmpty } from "./chart-empty";
import { ChartFrame } from "./chart-frame";

export function RegimenTimeline({ items }: { items: RegimenItem[] }) {
  return (
    <ChartFrame title={t("charts.regimen.title")} description={t("charts.regimen.description")}>
      {items.length ? <TimelineRows items={items} /> : <ChartEmpty title={t("charts.regimen.empty")} description={t("charts.regimen.emptyDescription")} />}
    </ChartFrame>
  );
}

function TimelineRows({ items }: { items: RegimenItem[] }) {
  const today = todayString();
  const spans = items.map((item) => ({ item, start: item.startDate || item.stopDate || today, end: item.stopDate || (item.active ? today : item.startDate || today) }));
  const domain = extent(spans.flatMap((span) => [Date.parse(`${span.start}T00:00:00`), Date.parse(`${span.end}T00:00:00`)])) || [0, 1];
  const scale = linearScale(domain[0] === domain[1] ? [domain[0] - 86400000, domain[1] + 86400000] : domain, [0, 100]);
  return (
    <div className="timeline-list">
      {spans.map(({ item, start, end }) => {
        const left = scale(Date.parse(`${start}T00:00:00`));
        const right = scale(Date.parse(`${end}T00:00:00`));
        return (
          <div className="timeline-row" key={item.id}>
            <div className="min-w-0">
              <strong className="block truncate">{item.name}</strong>
              <small className="text-muted-foreground">{item.kind === "medication" ? t("medications.kind.medication") : t("medications.kind.supplement")}</small>
            </div>
            <div className="timeline-track" aria-label={dateLabel(item, start, end)}>
              <span className={item.active ? "timeline-bar active" : "timeline-bar"} style={{ left: `${Math.min(left, right)}%`, width: `${Math.max(2, Math.abs(right - left))}%` }} />
            </div>
            <small className="text-right text-muted-foreground">{dateLabel(item, start, end)}</small>
          </div>
        );
      })}
    </div>
  );
}

function dateLabel(item: RegimenItem, start: string, end: string): string {
  if (!item.startDate) return t("charts.regimen.dateMissing");
  return item.stopDate ? t("charts.regimen.dateRange", { start: formatDate(start), stop: formatDate(end) }) : t("charts.regimen.since", { date: formatDate(start) });
}
