import anatomyBodyUrl from "../../assets/anatomy-body-dashboard.png";
import { useMemo } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionAction, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { getOrganVisual, statusLabel, wholeBodySystems, type HealthStatus, type OrganSummary, type SymptomEntry } from "../dashboard-model";
import { formatDate } from "../dashboard-format";
import { t } from "../i18n";
import { groupByMarker } from "../sparkline";
import type { DashboardController } from "../use-dashboard-controller";
import { AddResultDropdown } from "./add-result-dropdown";
import { ConditionsCard } from "./conditions-card";
import { Check, NotebookPen, organIcons } from "./health-icons";
import { EmptyMessage, StatTile, StatusBadge, StatusDot } from "./health-status";
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
    </div>
  );
}

function OverviewHero({ controller }: { controller: DashboardController }) {
  const series = useMemo(() => groupByMarker(controller.display.latestLabResults), [controller.display.latestLabResults]);
  const attention = series.filter((item) => item.status === "attention").length;
  const monitor = series.filter((item) => item.status === "monitor").length;
  const inRange = series.length - attention - monitor;
  const total = attention + monitor;

  const lead = total === 0
    ? controller.latestDate ? t("body.hero.noneFollowUp") : t("body.hero.startHistory")
    : attention > 0
      ? t(attention === 1 ? "body.hero.markerNeeds" : "body.hero.markersNeed", { count: attention })
      : t(monitor === 1 ? "body.hero.markerWatch" : "body.hero.markersWatch", { count: monitor });
  const detail = total === 0
    ? controller.latestDate ? t("body.hero.inRangeDetail") : t("body.hero.emptyDetail")
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
              title={t("body.hero.showOrgan", { organ: organ.name })}
              type="button"
            >
              <StatusBadge status={organ.status}>{organ.name}</StatusBadge>
            </button>
          ))}
          {controller.latestDate ? (
            <span className="text-xs text-muted-foreground">{t("body.hero.updated", { date: formatDate(controller.latestDate) })}</span>
          ) : null}
        </div>
      </div>
      <div className="stat-tiles" role="group" aria-label={t("body.hero.markerStatusLabel")}>
        <StatTile count={attention} label={t("body.stat.needsAttention")} status="attention" />
        <StatTile count={monitor} label={t("body.stat.toWatch")} status="monitor" />
        <StatTile count={inRange} label={t("body.stat.inRange")} status="normal" />
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
  const recordCount = organ.labCount + organ.symptomCount;
  return (
    <Button
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
            aria-label={t("body.anatomy.select", { organ: organ.name })}
            className={`hotspot status-${organ.status} ${visual.y < 30 ? "label-below" : ""} ${organ.key === controller.selectedOrganKey ? "selected" : ""}`}
            key={organ.key}
            onClick={() => controller.setSelectedOrganKey(organ.key)}
            style={{ "--x": visual.x, "--y": visual.y, "--organ-color": visual.color } as React.CSSProperties}
            type="button"
            variant="ghost"
          >
            <span className="hotspot-label"><StatusDot status={organ.status} />{organ.name}</span>
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
    <div className="detail-rail">
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
      <RecentCard controller={controller} />
    </div>
  );
}

/* Replaces the previous Labs / Symptoms / Activity / AI Chat stack. Those were
   four titled cards, one of which (AI Chat) duplicated the Chat page. Labs,
   symptoms, and daily logs now share one card with lightweight Section
   sub-sections, and the AI Chat preview is removed entirely. */
function RecentCard({ controller }: { controller: DashboardController }) {
  const labSeries = groupByMarker(controller.organLabs).slice(0, 4);
  const recentSymptoms = controller.organSymptoms.slice(0, 4);
  const recentActivity = controller.userState.activityEntries.slice(0, 3);
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
                <div className="lab-summary-row text-sm" key={item.marker}>
                  <div className="min-w-0"><strong className="block truncate">{item.marker}</strong><small className="text-muted-foreground">{item.unit || t("body.recent.valueUnit")}</small></div>
                  <SparklineView series={item} />
                  <strong className="text-right text-lg font-semibold">{latest.value}</strong>
                  <StatusBadge status={latest.status} />
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
        <Separator />
        <Section>
          <SectionHeader>
            <SectionTitle>{t("body.recent.dailyLog")}</SectionTitle>
            <SectionAction><Button variant="link" size="sm" onClick={() => controller.openDialog("activity")}>{t("body.recent.add")}</Button></SectionAction>
          </SectionHeader>
          <SectionContent className="gap-2">
            {recentActivity.map((entry) => (
              <div className="grid grid-cols-[90px_1fr] gap-2 text-sm" key={entry.id}>
                <span className="text-muted-foreground">{formatDate(entry.loggedAt)}</span>
                <div><strong>{entry.activityName || t("body.recent.dailyEntry")}</strong><p className="text-muted-foreground">{entry.notes || t("body.recent.promptEntry")}</p></div>
              </div>
            ))}
            {recentActivity.length === 0 ? <EmptyMessage>{t("body.recent.noDailyEntries")}</EmptyMessage> : null}
          </SectionContent>
        </Section>
      </CardContent>
    </Card>
  );
}

function symptomStatus(symptom: SymptomEntry): HealthStatus {
  if (symptom.severity >= 4) return "attention";
  if (symptom.severity >= 2) return "monitor";
  return "normal";
}

function organSummary(controller: DashboardController): string {
  if (controller.selectedOrgan.status === "normal" && controller.organLabs.length === 0 && controller.organSymptoms.length === 0) {
    return t("body.summary.empty", { organ: controller.selectedOrgan.name });
  }
  if (controller.selectedOrgan.status === "normal") return t("body.summary.normal", { organ: controller.selectedOrgan.name });
  return t("body.summary.monitor", { organ: controller.selectedOrgan.name.toLowerCase() });
}
