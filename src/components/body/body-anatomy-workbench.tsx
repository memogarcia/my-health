import anatomyBodyUrl from "../../../assets/anatomy-body-dashboard.jpg";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Section, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getOrganVisual, wholeBodySystems, type OrganSummary } from "../../dashboard-model";
import { t } from "../../i18n";
import type { DashboardController } from "../../use-dashboard-controller";
import { organIcons } from "../health-icons";
import { StatusDot } from "../health-status";
import { organRecordCount, organVisualStatus, visualStatusLabel } from "./body-workspace-utils";

export function OrganRail({ controller }: { controller: DashboardController }) {
  const organsOnly = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  const systems = controller.display.organs.filter((organ) => wholeBodySystems.has(organ.key));

  return (
    <Section className="organ-panel" aria-label={t("body.organs.title")}>
      <SectionHeader className="organ-panel-header">
        <div className="min-w-0">
          <SectionTitle>{t("body.organs.title")}</SectionTitle>
          <p className="text-xs text-muted-foreground">{t("body.organs.description")}</p>
        </div>
      </SectionHeader>
      <SectionContent className="organ-list">
        {organsOnly.map((organ) => <OrganButton controller={controller} organ={organ} key={organ.key} />)}
        {systems.length ? (
          <>
            <Separator className="organ-list-separator" />
            <p className="organ-list-label">{t("body.organs.wholeBody")}</p>
            {systems.map((organ) => <OrganButton controller={controller} organ={organ} key={organ.key} />)}
          </>
        ) : null}
      </SectionContent>
    </Section>
  );
}

function OrganButton({ controller, organ }: { controller: DashboardController; organ: OrganSummary }) {
  const Icon = organIcons[organ.key] || organIcons.heart;
  const selected = organ.key === controller.selectedOrganKey;
  const recordCount = organRecordCount(controller, organ);
  const visualStatus = organVisualStatus(controller, organ);

  return (
    <Button
      aria-controls="selected-organ-details"
      aria-pressed={selected}
      className="organ-row"
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
        <small className="flex items-center gap-1 font-normal text-muted-foreground">
          <StatusDot status={visualStatus} />
          {visualStatusLabel(visualStatus)}
        </small>
      </span>
      {recordCount > 0 ? (
        <span className="organ-record-count tnum" title={t("body.organ.linkedRecords", { count: recordCount })}>{recordCount}</span>
      ) : null}
    </Button>
  );
}

export function AnatomyStage({ controller }: { controller: DashboardController }) {
  return (
    <div className="anatomy-stage" aria-label={t("body.anatomy.label")}>
      <div className="anatomy-image-plane">
        <img src={anatomyBodyUrl} alt={t("body.anatomy.alt")} />
        {controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key)).map((organ) => {
          const visual = getOrganVisual(organ.key);
          const visualStatus = organVisualStatus(controller, organ);
          const label = visualStatusLabel(visualStatus);
          const selected = organ.key === controller.selectedOrganKey;
          return (
            <Button
              aria-controls="selected-organ-details"
              aria-label={t("body.anatomy.select", { organ: organ.name, status: label })}
              aria-pressed={selected}
              className={cn("hotspot", `status-${visualStatus}`, visual.y < 30 && "label-below", selected && "selected")}
              key={organ.key}
              onClick={() => controller.setSelectedOrganKey(organ.key)}
              style={{ "--x": portraitCropX(visual.x), "--y": visual.y, "--organ-color": visual.color } as React.CSSProperties}
              type="button"
              variant="ghost"
            >
              <span className="hotspot-dot" />
              <span className="hotspot-label"><StatusDot status={visualStatus} />{organ.name}<span aria-hidden="true">·</span>{label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/* The source image is 3:2. The visible coordinate plane is a centered 3:4
   portrait crop, so remap source X percentages into that stable crop. */
function portraitCropX(sourceX: number): number {
  return Math.max(4, Math.min(96, sourceX * 2 - 50));
}
