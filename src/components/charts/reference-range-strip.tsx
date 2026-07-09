import type { HealthStatus } from "../../dashboard-model";
import { t } from "../../i18n";
import { clamp } from "../../charts/chart-scale";

type ReferenceRangeStripProps = {
  value: number | null;
  low?: number | null;
  high?: number | null;
  status?: HealthStatus;
  compact?: boolean;
};

export function ReferenceRangeStrip({ value, low, high, status = "normal", compact = false }: ReferenceRangeStripProps) {
  const hasRange = typeof low === "number" && typeof high === "number" && high > low;
  if (value == null || !hasRange) {
    return <div className="reference-strip-empty text-xs text-muted-foreground">{t("charts.lab.noReferenceRange")}</div>;
  }
  const span = high - low;
  const min = low - span * 0.5;
  const max = high + span * 0.5;
  const dot = clamp(((value - min) / (max - min)) * 100, 2, 98);
  return (
    <div className={compact ? "reference-strip compact" : "reference-strip"} aria-label={t("charts.lab.referenceRange")}> 
      <div className="reference-strip-track">
        <span className="reference-strip-band" />
        <span className={`reference-strip-dot status-${status}`} style={{ left: `${dot}%` }} />
      </div>
      {!compact ? (
        <div className="reference-strip-labels text-[0.68rem] text-muted-foreground">
          <span>{low}</span>
          <span>{t("charts.lab.referenceRange")}</span>
          <span>{high}</span>
        </div>
      ) : null}
    </div>
  );
}
