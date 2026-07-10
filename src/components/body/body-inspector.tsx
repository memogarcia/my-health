import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionAction, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { type HealthStatus, type SymptomEntry } from "../../dashboard-model";
import { t } from "../../i18n";
import { groupByMarker } from "../../sparkline";
import type { DashboardController } from "../../use-dashboard-controller";
import { AddResultDropdown } from "../add-result-dropdown";
import { ConditionsCard } from "../conditions-card";
import { OrganTrendPreview } from "../charts/organ-trend-preview";
import { NotebookPen } from "../health-icons";
import { EmptyMessage, StatusBadge } from "../health-status";
import { LabFollowUpBadge } from "../lab-result-context";
import { SparklineView } from "../sparkline-view";
import { BodyCollapseToggle } from "./body-collapse-toggle";
import { organVisualStatus, visualStatusLabel } from "./body-workspace-utils";

export function BodyInspector({ controller, collapsed, onToggle }: { controller: DashboardController; collapsed: boolean; onToggle: () => void }) {
  const visualStatus = organVisualStatus(controller, controller.selectedOrgan);
  const status = visualStatusLabel(visualStatus);

  return (
    <aside id="selected-organ-details" className={collapsed ? "detail-rail detail-rail-collapsed" : "detail-rail"} aria-label={controller.selectedOrgan.name}>
      <p className="sr-only" aria-live="polite">{t("body.detail.announcement", { organ: controller.selectedOrgan.name, status })}</p>
      {collapsed ? <header className="inspector-collapsed-header">
        <BodyCollapseToggle collapsed onToggle={onToggle} section={t("body.section.sidebar")} />
      </header> : <>
      <header className="inspector-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{controller.selectedOrgan.system}</p>
            <h2>{controller.selectedOrgan.name}</h2>
          </div>
          <StatusBadge status={visualStatus} />
          <BodyCollapseToggle collapsed={false} onToggle={onToggle} section={t("body.section.sidebar")} />
        </div>
        <p className="text-sm text-muted-foreground">{organSummary(controller)}</p>
        <div className="flex flex-wrap gap-2">
          <AddResultDropdown controller={controller} />
          <Button size="sm" variant="outline" onClick={() => controller.openDialog("symptom")}>
            <NotebookPen data-icon="inline-start" />{t("body.detail.logSymptom")}
          </Button>
        </div>
      </header>
      <ConditionsCard controller={controller} />
      <OrganTrendPreview labs={controller.organLabs} onViewAll={() => controller.setSelectedNav("labs")} />
      <RecentCard controller={controller} />
      </>}
    </aside>
  );
}

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
            {recentSymptoms.length ? recentSymptoms.map((symptom) => <StatusBadge key={symptom.id} status={symptomStatus(symptom)}>{symptom.name}</StatusBadge>) : <EmptyMessage>{t("body.recent.noneTracked")}</EmptyMessage>}
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
  if (controller.selectedOrgan.status === "normal" && controller.organLabs.length === 0 && controller.organSymptoms.length === 0 && controller.organConditions.length === 0) {
    return t("body.summary.empty", { organ: controller.selectedOrgan.name });
  }
  if (controller.selectedOrgan.status === "normal") return t("body.summary.normal", { organ: controller.selectedOrgan.name });
  if (controller.selectedOrgan.status === "attention") return t("body.summary.attention", { organ: controller.selectedOrgan.name.toLowerCase() });
  return t("body.summary.monitor", { organ: controller.selectedOrgan.name.toLowerCase() });
}
