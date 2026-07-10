import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, CircleHelp, Minus } from "lucide-react";
import type { ComponentType } from "react";
import type { HealthStatus, LabFlag } from "../dashboard-model";
import { t } from "../i18n";
import { StatusBadge } from "./health-status";

const flagIcons: Record<LabFlag, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  low: ArrowDown,
  normal: Minus,
  high: ArrowUp,
  unknown: CircleHelp,
};

export function labFlagLabel(flag: LabFlag): string {
  const labels: Record<LabFlag, string> = {
    low: t("lab.flag.low"),
    normal: t("lab.flag.normal"),
    high: t("lab.flag.high"),
    unknown: t("lab.flag.unknown"),
  };
  return labels[flag];
}

export function followUpPriorityLabel(status: HealthStatus): string {
  const labels: Record<HealthStatus, string> = {
    normal: t("lab.followUp.normal"),
    monitor: t("lab.followUp.monitor"),
    attention: t("lab.followUp.attention"),
  };
  return labels[status];
}

/** Neutral reference-range context. It never carries follow-up status color. */
export function LabFlagBadge({ flag }: { flag: LabFlag }) {
  const Icon = flagIcons[flag];
  const label = t("lab.flag.badge", { flag: labFlagLabel(flag) });
  return (
    <Badge variant="outline" className="gap-1 bg-muted/30 text-muted-foreground" aria-label={label}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

/** User-selected follow-up priority, kept separate from the derived lab flag. */
export function LabFollowUpBadge({ status }: { status: HealthStatus }) {
  return (
    <StatusBadge status={status}>
      {t("lab.followUp.badge", { priority: followUpPriorityLabel(status) })}
    </StatusBadge>
  );
}
