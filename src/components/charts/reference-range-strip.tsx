import type { LabFlag } from "../../dashboard-model";
import { t } from "../../i18n";
import { clamp } from "../../charts/chart-scale";
import { labFlagLabel } from "../lab-result-context";

type ReferenceRangeStripProps = {
  value: number | null;
  low?: number | null;
  high?: number | null;
  flag?: LabFlag;
  compact?: boolean;
  referenceRange?: string;
};

export function ReferenceRangeStrip({ value, low, high, flag = "unknown", compact = false, referenceRange = "" }: ReferenceRangeStripProps) {
  const hasRange = typeof low === "number" && typeof high === "number" && high > low;
  const rangeLabel = referenceRange.trim();
  if (value == null || !hasRange) {
    return (
      <div className="reference-strip-empty text-xs text-muted-foreground">
        {rangeLabel ? t("charts.lab.referenceRangeValue", { range: rangeLabel }) : t("charts.lab.noReferenceRange")}
      </div>
    );
  }
  const span = high - low;
  const min = low - span * 0.5;
  const max = high + span * 0.5;
  const dot = clamp(((value - min) / (max - min)) * 100, 2, 98);
  return (
    <div className={compact ? "reference-strip compact" : "reference-strip"} aria-label={t("lab.flag.badge", { flag: labFlagLabel(flag) })}>
      <div className="reference-strip-track">
        <span className="reference-strip-band" />
        <span className="reference-strip-dot" style={{ left: `${dot}%` }} />
      </div>
      {compact && rangeLabel ? (
        <div className="mt-1 text-xs text-muted-foreground">{t("charts.lab.referenceRangeValue", { range: rangeLabel })}</div>
      ) : null}
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
