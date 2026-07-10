import anatomyBodyUrl from "../../assets/anatomy-body-dashboard.jpg";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionAction, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { getOrganVisual, statusLabel, wholeBodySystems, type ActivityEntry, type HealthStatus, type OrganSummary, type SymptomEntry } from "../dashboard-model";
import { formatDate } from "../dashboard-format";
import { t } from "../i18n";
import { groupByMarker } from "../sparkline";
import type { DashboardController } from "../use-dashboard-controller";
import { AddResultDropdown } from "./add-result-dropdown";
import { ConditionsCard } from "./conditions-card";
import { OrganTrendPreview } from "./charts/organ-trend-preview";
import { Check, NotebookPen, organIcons } from "./health-icons";
import { EmptyMessage, StatTile, StatusBadge, StatusDot } from "./health-status";
import { LabFollowUpBadge } from "./lab-result-context";
import { SparklineView } from "./sparkline-view";

export function BodyWorkspace({ controller }: { controller: DashboardController }) {
  return (
    <div className="grid gap-4">
      <OverviewHero controller={controller} />
      <section className="body-workspace-grid">
        <OrganRail controller={controller} />
        <AnatomyStage controller={controller} />
        <DetailRail controller={controller} />
      </section>
      <DailyLogCard controller={controller} />
    </div>
  );
}

function OverviewHero({ controller }: { controller: DashboardController }) {
  const trackedKeys = new Set([
    ...controller.display.latestLabResults.map((lab) => lab.organKey),
    ...controller.display.recentSymptoms.map((symptom) => symptom.organKey),
    ...controller.display.conditions.map((condition) => condition.organKey),
  ]);
  const trackedOrgans = controller.display.organs.filter((organ) => trackedKeys.has(organ.key));
  const attention = trackedOrgans.filter((organ) => organ.status === "attention").length;
  const monitor = trackedOrgans.filter((organ) => organ.status === "monitor").length;
  const noFollowUp = trackedOrgans.length - attention - monitor;
  const total = attention + monitor;
  const hasHistory = trackedOrgans.length > 0;

  const lead = !hasHistory
    ? t("body.hero.startHistory")
    : total === 0
      ? t("body.hero.noCurrentSignals")
    : attention > 0
      ? t(attention === 1 ? "body.hero.areaNeeds" : "body.hero.areasNeed", { count: attention })
      : t(monitor === 1 ? "body.hero.areaWatch" : "body.hero.areasWatch", { count: monitor });
  const detail = !hasHistory
    ? t("body.hero.emptyDetail")
    : total === 0
      ? t("body.hero.noCurrentDetail")
    : attention > 0
      ? t("body.hero.attentionDetail")
      : t("body.hero.monitorDetail");

  return (
    <section className="overview-hero" aria-label={t("body.hero.label")}>
      <div className="min-w-0">
        <h2>{lead}</h2>
        <p className="text-sm text-muted-foreground">{detail}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {controller.attentionOrgans.map((organ) => (
            <button
              className="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
              key={organ.key}
              onClick={() => controller.setSelectedOrganKey(organ.key)}
              title={t("body.hero.showOrgan", { organ: organ.name, status: statusLabel[organ.status] })}
              type="button"
            >
              <StatusBadge status={organ.status}>{organ.name}<span aria-hidden="true"> · </span>{statusLabel[organ.status]}</StatusBadge>
            </button>
          ))}
          {controller.latestDate ? (
            <span className="text-xs text-muted-foreground">{t("body.hero.updated", { date: formatDate(controller.latestDate) })}</span>
          ) : null}
        </div>
      </div>
      <div className="stat-tiles" role="group" aria-label={t("body.hero.areaStatusLabel")}>
        <StatTile count={attention} label={t("body.stat.needsAttention")} status="attention" />
        <StatTile count={monitor} label={t("body.stat.toWatch")} status="monitor" />
        <StatTile count={noFollowUp} label={t("body.stat.noFollowUp")} status="normal" />
      </div>
    </section>
  );
}

function OrganRail({ controller }: { controller: DashboardController }) {
  const organsOnly = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  const systems = controller.display.organs.filter((organ) => wholeBodySystems.has(organ.key));
  return (
    <Card className="organ-panel min-h-0">
      <CardHeader>
        <CardTitle>{t("body.organs.title")}</CardTitle>
        <CardDescription>{t("body.organs.description")}</CardDescription>
      </CardHeader>
      <CardContent className="organ-list">
        {organsOnly.map((organ) => <OrganButton controller={controller} organ={organ} key={organ.key} />)}
        {systems.length ? (
          <>
            <Separator className="my-1" />
            <p className="px-1 text-xs font-medium uppercase text-muted-foreground">{t("body.organs.wholeBody")}</p>
            {systems.map((organ) => <OrganButton controller={controller} organ={organ} key={organ.key} />)}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OrganButton({ controller, organ }: { controller: DashboardController; organ: OrganSummary }) {
  const Icon = organIcons[organ.key] || organIcons.heart;
  const selected = organ.key === controller.selectedOrganKey;
  const conditionCount = controller.display.conditions.filter((condition) => condition.organKey === organ.key).length;
  const recordCount = organ.labCount + organ.symptomCount + conditionCount;
  return (
    <Button
      aria-controls="selected-organ-details"
      aria-pressed={selected}
      className="h-auto justify-start gap-3 px-2 py-2"
      onClick={() => {
        controller.setSelectedOrganKey(organ.key);
        controller.setSelectedNav("body");
      }}
      type="button"
      variant={selected ? "secondary" : "ghost"}
    >
      <span className="organ-icon" style={{ "--organ-color": getOrganVisual(organ.key).color } as React.CSSProperties}>
        <Icon />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate">{organ.name}</span>
        <small className="flex items-center gap-1 font-normal text-muted-foreground"><StatusDot status={organ.status} />{statusLabel[organ.status]}</small>
      </span>
      {recordCount > 0 ? <span className="tnum text-xs text-muted-foreground" title={t("body.organ.linkedRecords", { count: recordCount })}>{recordCount}</span> : null}
    </Button>
  );
}

function AnatomyStage({ controller }: { controller: DashboardController }) {
  return (
    <div className="anatomy-stage" aria-label={t("body.anatomy.label")}>
      <img src={anatomyBodyUrl} alt={t("body.anatomy.alt")} />
      {controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key)).map((organ) => {
        const visual = getOrganVisual(organ.key);
        return (
          <Button
            aria-controls="selected-organ-details"
            aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })}
            aria-pressed={organ.key === controller.selectedOrganKey}
            className={`hotspot status-${organ.status} ${visual.y < 30 ? "label-below" : ""} ${organ.key === controller.selectedOrganKey ? "selected" : ""}`}
            key={organ.key}
            onClick={() => controller.setSelectedOrganKey(organ.key)}
            style={{ "--x": visual.x, "--y": visual.y, "--organ-color": visual.color } as React.CSSProperties}
            type="button"
            variant="ghost"
          >
            <span className="hotspot-label"><StatusDot status={organ.status} />{organ.name}<span aria-hidden="true">·</span>{statusLabel[organ.status]}</span>
          </Button>
        );
      })}
      <div className="anatomy-caption">
        <strong>{controller.selectedOrgan.name}</strong>
        <span className="text-muted-foreground">{t("body.anatomy.system", { system: controller.selectedOrgan.system })}</span>
        <StatusBadge status={controller.selectedOrgan.status} />
      </div>
    </div>
  );
}

function DetailRail({ controller }: { controller: DashboardController }) {
  return (
    <div id="selected-organ-details" className="detail-rail" aria-live="polite">
      <Card className="selected-organ-card">
        <CardHeader>
          <CardTitle>{controller.selectedOrgan.name}</CardTitle>
          <CardAction><StatusBadge status={controller.selectedOrgan.status} /></CardAction>
          <CardDescription>{organSummary(controller)}</CardDescription>
        </CardHeader>
        <CardFooter className="gap-2 border-t-0 bg-transparent pt-0 pb-(--card-spacing)">
          <AddResultDropdown controller={controller} />
          <Button size="sm" variant="outline" onClick={() => controller.openDialog("symptom")}>
            <NotebookPen data-icon="inline-start" />{t("body.detail.logSymptom")}
          </Button>
        </CardFooter>
      </Card>
      <ConditionsCard controller={controller} />
      <OrganTrendPreview labs={controller.organLabs} onViewAll={() => controller.setSelectedNav("labs")} />
      <RecentCard controller={controller} />
    </div>
  );
}

/* Organ-scoped records stay together here. Daily logs remain in the global
   dashboard card below the anatomy workspace, never in the selected-organ rail. */
function RecentCard({ controller }: { controller: DashboardController }) {
  const labSeries = groupByMarker(controller.organLabs).slice(0, 4);
  const recentSymptoms = controller.organSymptoms.slice(0, 4);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("body.recent.title")}</CardTitle>
        <CardDescription>{t("body.recent.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Section>
          <SectionHeader>
            <SectionTitle>{t("body.recent.labs")}</SectionTitle>
            <SectionAction><Button variant="link" size="sm" onClick={() => controller.setSelectedNav("labs")}>{t("body.recent.viewAll")}</Button></SectionAction>
          </SectionHeader>
          <SectionContent className="gap-2.5">
            {labSeries.length ? labSeries.map((item) => {
              const latest = item.points[item.points.length - 1];
              return (
                <div className="lab-summary-row text-sm" key={item.key}>
                  <div className="min-w-0"><strong className="block truncate">{item.marker}</strong><small className="text-muted-foreground">{item.unit || t("body.recent.valueUnit")}</small></div>
                  <SparklineView series={item} />
                  <strong className="text-right text-lg font-semibold">{latest.value}</strong>
                  <LabFollowUpBadge status={latest.status} />
                </div>
              );
            }) : <EmptyMessage>{t("body.recent.noResults")}</EmptyMessage>}
          </SectionContent>
        </Section>
        <Separator />
        <Section>
          <SectionHeader>
            <SectionTitle>{t("body.recent.symptoms")}</SectionTitle>
            <SectionAction><Button variant="link" size="sm" onClick={() => controller.setSelectedNav("symptoms")}>{t("body.recent.viewAll")}</Button></SectionAction>
          </SectionHeader>
          <SectionContent className="flex flex-wrap gap-2">
            {recentSymptoms.length ? recentSymptoms.map((symptom) => <StatusBadge key={symptom.id} status={symptomStatus(symptom)}>{symptom.name}</StatusBadge>) : <StatusBadge status="normal"><Check />{t("body.recent.noneTracked")}</StatusBadge>}
          </SectionContent>
        </Section>
      </CardContent>
    </Card>
  );
}

function DailyLogCard({ controller }: { controller: DashboardController }) {
  const entries = controller.userState.activityEntries;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("body.recent.dailyLog")}</CardTitle>
        <CardDescription>{t("body.dailyLog.description")}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => controller.openDialog("activity")}>
            <NotebookPen data-icon="inline-start" />{t("body.recent.add")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
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
      </CardContent>
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

function symptomStatus(symptom: SymptomEntry): HealthStatus {
  if (symptom.severity >= 4) return "attention";
  if (symptom.severity >= 2) return "monitor";
  return "normal";
}

function organSummary(controller: DashboardController): string {
  if (controller.selectedOrgan.status === "normal" && controller.organLabs.length === 0 && controller.organSymptoms.length === 0 && controller.organConditions.length === 0) {
    return t("body.summary.empty", { organ: controller.selectedOrgan.name });
  }
  if (controller.selectedOrgan.status === "normal") return t("body.summary.normal", { organ: controller.selectedOrgan.name });
  if (controller.selectedOrgan.status === "attention") return t("body.summary.attention", { organ: controller.selectedOrgan.name.toLowerCase() });
  return t("body.summary.monitor", { organ: controller.selectedOrgan.name.toLowerCase() });
}
