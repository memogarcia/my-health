import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "../dashboard-format";
import { type ActivityEntry } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AnatomyStage, OrganRail } from "./body/body-anatomy-workbench";
import { BodyInspector } from "./body/body-inspector";
import { EmptyMessage, StatusDot, type VisualHealthStatus } from "./health-status";
import { NotebookPen } from "./health-icons";
import { BodyCollapseToggle } from "./body/body-collapse-toggle";

export function BodyWorkspace({ controller }: { controller: DashboardController }) {
  const [collapsed, setCollapsed] = useState({ attention: false, organs: false, dailyLog: false, inspector: false });
  const toggle = (section: keyof typeof collapsed) => setCollapsed((current) => ({ ...current, [section]: !current[section] }));
  return (
    <div className="body-page">
      <BodyStatusStrip controller={controller} collapsed={collapsed.attention} onToggle={() => toggle("attention")} />
      <div className={cn("body-workbench", collapsed.organs && "organs-collapsed", collapsed.inspector && "inspector-collapsed")}>
        <OrganRail controller={controller} collapsed={collapsed.organs} onToggle={() => toggle("organs")} />
        <AnatomyStage controller={controller} />
        <BodyInspector controller={controller} collapsed={collapsed.inspector} onToggle={() => toggle("inspector")} />
      </div>
      <DailyLogCard controller={controller} collapsed={collapsed.dailyLog} onToggle={() => toggle("dailyLog")} />
    </div>
  );
}

function BodyStatusStrip({ controller, collapsed, onToggle }: { controller: DashboardController; collapsed: boolean; onToggle: () => void }) {
  const trackedKeys = new Set([
    ...controller.display.latestLabResults.map((lab) => lab.organKey),
    ...controller.display.recentSymptoms.map((symptom) => symptom.organKey),
    ...controller.display.conditions.map((condition) => condition.organKey),
  ]);
  const trackedOrgans = controller.display.organs.filter((organ) => trackedKeys.has(organ.key));
  const attention = trackedOrgans.filter((organ) => organ.status === "attention").length;
  const monitor = trackedOrgans.filter((organ) => organ.status === "monitor").length;
  const noFollowUp = trackedOrgans.length - attention - monitor;
  const hasHistory = trackedOrgans.length > 0;
  const visualStatus: VisualHealthStatus = !hasHistory ? "empty" : attention > 0 ? "attention" : monitor > 0 ? "monitor" : "normal";

  const lead = !hasHistory
    ? t("body.hero.startHistory")
    : attention === 0 && monitor === 0
      ? t("body.hero.noCurrentSignals")
      : attention > 0
        ? t(attention === 1 ? "body.hero.areaNeeds" : "body.hero.areasNeed", { count: attention })
        : t(monitor === 1 ? "body.hero.areaWatch" : "body.hero.areasWatch", { count: monitor });
  const detail = !hasHistory
    ? t("body.hero.emptyDetail")
    : attention === 0 && monitor === 0
      ? t("body.hero.noCurrentDetail")
      : attention > 0
        ? t("body.hero.attentionDetail")
        : t("body.hero.monitorDetail");

  if (collapsed) {
    return (
      <section className="body-status-strip body-status-strip-collapsed" aria-label={t("body.hero.label")}>
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status={visualStatus} />
          <strong className="truncate text-sm">{t("body.hero.label")}</strong>
        </div>
        <BodyCollapseToggle collapsed onToggle={onToggle} section={t("body.section.attention")} />
      </section>
    );
  }

  return (
    <section className="body-status-strip" aria-label={t("body.hero.label")}>
      <div className="body-status-copy">
        <StatusDot status={visualStatus} />
        <div className="min-w-0">
          <h2>{lead}</h2>
          <p>{detail}</p>
          {controller.attentionOrgans.length ? (
            <div className="body-status-links">
              {controller.attentionOrgans.map((organ) => (
                <Button key={organ.key} size="xs" variant="outline" onClick={() => controller.setSelectedOrganKey(organ.key)}>
                  <StatusDot status={organ.status} />{organ.name}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="body-status-meta">
        {controller.latestDate ? <time dateTime={controller.latestDate}>{t("body.hero.updated", { date: formatDate(controller.latestDate) })}</time> : null}
        <dl className="body-status-counts" aria-label={t("body.hero.areaStatusLabel")}>
          <StatusCount count={attention} label={t("body.stat.needsAttention")} status="attention" />
          <StatusCount count={monitor} label={t("body.stat.toWatch")} status="monitor" />
          <StatusCount count={noFollowUp} label={t("body.stat.noFollowUp")} status="normal" />
        </dl>
        <BodyCollapseToggle collapsed={false} onToggle={onToggle} section={t("body.section.attention")} />
      </div>
    </section>
  );
}

function StatusCount({ count, label, status }: { count: number; label: string; status: VisualHealthStatus }) {
  return (
    <div className={`status-${status}`}>
      <dt>{label}</dt>
      <dd className="tnum">{count}</dd>
    </div>
  );
}

function DailyLogCard({ controller, collapsed, onToggle }: { controller: DashboardController; collapsed: boolean; onToggle: () => void }) {
  const entries = controller.userState.activityEntries;
  return (
    <Card className={cn("daily-log-card", collapsed && "daily-log-card-collapsed")} size="sm">
      <CardHeader>
        <CardTitle>{t("body.recent.dailyLog")}</CardTitle>
        <CardDescription>{t("body.dailyLog.description")}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => controller.openDialog("activity")}>
            <NotebookPen data-icon="inline-start" />{t("body.recent.add")}
          </Button>
          <BodyCollapseToggle collapsed={collapsed} onToggle={onToggle} section={t("body.section.dailyLog")} />
        </CardAction>
      </CardHeader>
      {!collapsed ? <CardContent>
        {entries.length ? (
          <div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <article className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-3 rounded-lg border border-border/70 bg-background/55 px-3 py-2 text-sm" key={entry.id}>
                <time className="text-muted-foreground" dateTime={entry.loggedAt}>{formatDate(entry.loggedAt)}</time>
                <div className="min-w-0">
                  <strong className="block truncate">{entry.activityName || t("body.recent.dailyEntry")}</strong>
                  <p className="text-muted-foreground">{activitySummary(entry)}</p>
                  {entry.notes ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{entry.notes}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyMessage>{t("body.recent.noDailyEntries")}</EmptyMessage>}
      </CardContent> : null}
    </Card>
  );
}

function activitySummary(entry: ActivityEntry): string {
  const parts = [];
  if (entry.durationMinutes) parts.push(t("body.recent.activityMinutes", { count: entry.durationMinutes }));
  if (entry.cigarettes) parts.push(t("body.recent.cigarettes", { count: entry.cigarettes }));
  if (entry.drinks) parts.push(t("body.recent.drinks", { count: entry.drinks }));
  return parts.join(" · ") || t("body.recent.promptEntry");
}
