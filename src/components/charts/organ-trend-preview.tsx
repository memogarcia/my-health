import { Button } from "@/components/ui/button";
import type { LabResult } from "../../dashboard-model";
import { formatDate } from "../../dashboard-format";
import { buildNumericLabSeries, pickDefaultLabSeries } from "../../charts/lab-series";
import { t } from "../../i18n";
import { LabFlagBadge, LabFollowUpBadge } from "../lab-result-context";
import { ReferenceRangeStrip } from "./reference-range-strip";

export function OrganTrendPreview({ labs, onViewAll }: { labs: LabResult[]; onViewAll: () => void }) {
  const selected = pickDefaultLabSeries(buildNumericLabSeries(labs));
  if (!selected) return null;
  const latest = selected.latest;
  const delta = selected.previous ? latest.numericValue - selected.previous.numericValue : null;
  return (
    <section className="organ-trend-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{t("charts.organ.title")}</p>
          <h3 className="truncate text-base font-semibold">{selected.marker}</h3>
          <p className="text-xs text-muted-foreground">{formatDate(latest.measuredAt)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onViewAll}>{t("charts.organ.viewLabs")}</Button>
      </div>
      <div className="mt-3 grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <strong className="text-xl tnum">{latest.value} {latest.unit}</strong>
          <LabFollowUpBadge status={latest.status} />
        </div>
        <LabFlagBadge flag={latest.flag} />
        <ReferenceRangeStrip compact value={latest.numericValue} low={latest.referenceLow} high={latest.referenceHigh} flag={latest.flag} referenceRange={latest.referenceRange} />
        <p className="text-xs text-muted-foreground">{delta == null ? t("charts.organ.firstReading") : t("charts.organ.delta", { value: `${delta > 0 ? "+" : ""}${formatNumber(delta)} ${latest.unit}` })}</p>
      </div>
    </section>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
