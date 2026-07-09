import type React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, type HealthStatus } from "../dashboard-model";

export function StatusDot({ status, className }: { status: HealthStatus; className?: string }) {
  return <span className={cn("status-dot", `status-${status}`, className)} aria-hidden="true" />;
}

export function StatusBadge({ status, children }: { status: HealthStatus; children?: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("health-status-badge", `status-${status}`)}>
      {children || statusLabel[status]}
    </Badge>
  );
}

export function StatTile({ count, label, status }: { count: number; label: string; status: HealthStatus }) {
  return (
    <div className={cn("stat-tile", count > 0 && `status-${status}`)}>
      <small>{label}</small>
      <strong>
        {count}
        <StatusDot status={status} className={count > 0 ? undefined : "status-empty"} />
      </strong>
    </div>
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
