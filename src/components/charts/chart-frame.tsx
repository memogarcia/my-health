import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartFrame({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card className="chart-shell">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
