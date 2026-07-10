import anatomyBodyUrl from "../../../assets/anatomy-body-dashboard.jpg";
import anatomyWomenBodyUrl from "../../../assets/anatomy-body-women-dashboard.png";
import { useRef, useState, type PointerEvent } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Section, SectionContent, SectionHeader, SectionTitle } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getOrganVisual, wholeBodySystems, type OrganSummary } from "../../dashboard-model";
import { bodyRegionAt, type BodyViewKey } from "../../body-region";
import { t } from "../../i18n";
import type { DashboardController } from "../../use-dashboard-controller";
import { organIcons } from "../health-icons";
import { StatusDot } from "../health-status";
import { BodyCollapseToggle } from "./body-collapse-toggle";
import { organRecordCount, organVisualStatus, visualStatusLabel } from "./body-workspace-utils";

export function OrganRail({ controller, collapsed, onToggle }: { controller: DashboardController; collapsed: boolean; onToggle: () => void }) {
  const organsOnly = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  const systems = controller.display.organs.filter((organ) => wholeBodySystems.has(organ.key));

  return (
    <Section className={cn("organ-panel", collapsed && "organ-panel-collapsed")} aria-label={t("body.organs.title")}>
      <SectionHeader className="organ-panel-header">
        <div className="min-w-0">
          <SectionTitle>{t("body.organs.title")}</SectionTitle>
          <p className="text-xs text-muted-foreground">{t("body.organs.description")}</p>
        </div>
        <BodyCollapseToggle collapsed={collapsed} direction="left" onToggle={onToggle} section={t("body.section.organs")} />
      </SectionHeader>
      {!collapsed ? <SectionContent className="organ-list">
        {organsOnly.map((organ) => <OrganButton controller={controller} organ={organ} key={organ.key} />)}
        {systems.length ? (
          <>
            <Separator className="organ-list-separator" />
            <p className="organ-list-label">{t("body.organs.wholeBody")}</p>
            {systems.map((organ) => <OrganButton controller={controller} organ={organ} key={organ.key} />)}
          </>
        ) : null}
      </SectionContent> : null}
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
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(0);
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, startRotation: 0, startTilt: 0, moved: false });
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const viewIndex = Math.round(normalizedRotation / 90) % 4;
  const view: BodyViewKey = (["front", "right", "back", "left"] as const)[viewIndex];
  const showsWomenBody = controller.userState.profile.sex === "female";
  const anatomySpriteUrl = showsWomenBody ? anatomyWomenBodyUrl : anatomyBodyUrl;
  const frontFacing = Math.cos(rotation * Math.PI / 180) >= 0;
  const visibleNotes = controller.userState.bodyNotes.filter((note) => Math.round(note.angle / 90) % 4 === viewIndex);

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest(".hotspot, .body-note-pin, .anatomy-view-button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startRotation: rotation, startTilt: tilt, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const horizontalDistance = event.clientX - dragRef.current.startX;
    const verticalDistance = event.clientY - dragRef.current.startY;
    if (Math.hypot(horizontalDistance, verticalDistance) > 4) dragRef.current.moved = true;
    setRotation(dragRef.current.startRotation + horizontalDistance * 0.45);
    setTilt(Math.max(-26, Math.min(26, dragRef.current.startTilt - verticalDistance * 0.16)));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (dragRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.pointerId = -1;
  }

  function createNote(event: React.MouseEvent<HTMLButtonElement>): void {
    if (dragRef.current.moved) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    const area = bodyRegionAt(x, y, normalizedRotation);
    controller.openBodyNote({
      area: t("body.notes.area", { area: t(`body.notes.region.${area.region}` as "body.notes.region.head"), view: t(`body.notes.view.${area.view}` as "body.notes.view.front") }),
      angle: area.angle,
      x,
      y,
    });
  }

  return (
    <div className="anatomy-stage" aria-label={t("body.anatomy.label")}>
      <div className="anatomy-rotation-toolbar">
        <span>{t("body.anatomy.rotate3dHint")}</span>
      </div>
      <div className="anatomy-image-plane" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div className="anatomy-3d-card" style={{ "--anatomy-rotation": `${rotation}deg`, "--anatomy-tilt": `${tilt}deg` } as React.CSSProperties}>
          <div className="anatomy-face anatomy-face-front">
            <img alt={t(showsWomenBody ? "body.anatomy.altFemale" : "body.anatomy.alt")} src={anatomySpriteUrl} />
            <button aria-label={t("body.notes.createAt", { view: t(`body.notes.view.${view}` as "body.notes.view.front") })} className="anatomy-note-surface" onClick={createNote} type="button" />
            {visibleNotes.map((note) => <span aria-label={t("body.notes.savedAt", { area: note.area })} className="body-note-pin" key={note.id} role="img" style={{ "--x": portraitCropX(note.x), "--y": note.y } as React.CSSProperties} title={note.note} />)}
            {frontFacing ? controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key)).map((organ) => {
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
            }) : null}
          </div>
          <div className="anatomy-face anatomy-face-back" aria-hidden="true">
            <img alt="" src={anatomySpriteUrl} />
            <button aria-label={t("body.notes.createAt", { view: t(`body.notes.view.${view}` as "body.notes.view.front") })} className="anatomy-note-surface" onClick={createNote} type="button" />
            {!frontFacing ? visibleNotes.map((note) => <span className="body-note-pin" key={note.id} style={{ "--x": portraitCropX(note.x), "--y": note.y } as React.CSSProperties} title={note.note} />) : null}
          </div>
        </div>
      </div>
      <p className="anatomy-rotation-status" aria-live="polite">{t("body.anatomy.currentView", { view: t(`body.notes.view.${view}` as "body.notes.view.front") })}</p>
    </div>
  );
}

function portraitCropX(sourceX: number): number {
  return Math.max(4, Math.min(96, sourceX * 2 - 50));
}
