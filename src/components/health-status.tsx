import type React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, type HealthStatus } from "../dashboard-model";
import { t } from "../i18n";

export type VisualHealthStatus = HealthStatus | "empty";

export function StatusDot({ status, className }: { status: VisualHealthStatus; className?: string }) {
  return <span className={cn("status-dot", `status-${status}`, className)} aria-hidden="true" />;
}

export function StatusBadge({ status, children }: { status: VisualHealthStatus; children?: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("health-status-badge", `status-${status}`)}>
      {children || (status === "empty" ? t("status.noData") : statusLabel[status])}
    </Badge>
  );
}

export function EmptyMessage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="status-dot status-empty" aria-hidden="true" />
      {children}
    </p>
  );
}
