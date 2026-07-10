import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { bodyRegionAt, type BodyViewKey } from "../body-region";
import { getOrganVisual, statusLabel, wholeBodySystems } from "../dashboard-model";
import { t, type TranslationKey } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

const anatomyDefault = new URL("../../assets/anatomy-body-dashboard.jpg", import.meta.url).href;
const anatomyFemale = new URL("../../assets/anatomy-body-women-dashboard.png", import.meta.url).href;
const surfaceDefault = new URL("../../assets/anatomy-body-360-sprite.png", import.meta.url).href;
const surfaceFemale = new URL("../../assets/anatomy-body-women-360-sprite.png", import.meta.url).href;
const views: Array<{ key: BodyViewKey; angle: number }> = [
  { key: "front", angle: 0 }, { key: "right", angle: 90 }, { key: "back", angle: 180 }, { key: "left", angle: 270 },
];

export function BodyCanvas({ controller }: { controller: DashboardController }) {
  const [mode, setMode] = useState<"organs" | "surface">("organs");
  const [viewIndex, setViewIndex] = useState(0);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const female = controller.userState.profile.sex === "female";
  const anatomy = female ? anatomyFemale : anatomyDefault;
  const surface = female ? surfaceFemale : surfaceDefault;
  const imageAlt = female ? t("body.anatomy.altFemale") : t("body.anatomy.alt");
  const view = views[viewIndex];

  function finishDrag(event: PointerEvent<HTMLDivElement>): void {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) < 36) return;
    setViewIndex((current) => (current + (delta < 0 ? 1 : 3)) % 4);
  }

  return (
    <section className="anatomy-canvas" aria-label={t("body.anatomy.label")}>
      <OrganIndex controller={controller} />
      <div className="anatomy-stage">
        {mode === "organs" ? <OrganView anatomy={anatomy} controller={controller} imageAlt={imageAlt} /> : (
          <div className="surface-stage">
            <div className="surface-figure" onPointerDown={(event) => { dragStart.current = event.clientX; dragged.current = false; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (dragStart.current !== null && Math.abs(event.clientX - dragStart.current) > 8) dragged.current = true; }} onPointerUp={finishDrag}>
              <img alt={t("body.surface.alt", { view: t(`body.notes.view.${view.key}` as TranslationKey) })} draggable={false} src={surface} style={{ transform: `translateX(-${viewIndex * 25}%)` }} />
              <SurfaceNotes controller={controller} dragged={dragged} viewIndex={viewIndex} />
            </div>
          </div>
        )}
        <div className="anatomy-toolbar">
          <span><strong>{mode === "organs" ? controller.selectedOrgan.name : t("body.surface.title")}</strong><small>{mode === "organs" ? t("body.workspace.mapHint") : t("body.surface.dragHint")}</small></span>
          <div className="view-switcher" role="group" aria-label={t("body.anatomy.viewControls")}>
            <button aria-pressed={mode === "organs"} onClick={() => setMode("organs")} type="button">{t("body.surface.organs")}</button>
            <button aria-pressed={mode === "surface"} onClick={() => setMode("surface")} type="button">{t("body.surface.body")}</button>
          </div>
        </div>
        {mode === "surface" ? (
          <div className="surface-view-dock" aria-label={t("body.anatomy.viewControls")} role="group">
            {views.map((item, index) => <button aria-pressed={index === viewIndex} key={item.key} onClick={() => setViewIndex(index)} type="button">{t(`body.notes.view.${item.key}` as TranslationKey)}</button>)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OrganView({ anatomy, controller, imageAlt }: { anatomy: string; controller: DashboardController; imageAlt: string }) {
  const visibleOrgans = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  return (
    <>
      <img alt={imageAlt} className="anatomy-image" src={anatomy} />
      <div className="canvas-vignette" />
      {visibleOrgans.map((organ) => {
        const visual = getOrganVisual(organ.key);
        const selected = organ.key === controller.selectedOrganKey;
        return (
          <button aria-controls="selected-organ-details" aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })} aria-pressed={selected} className="organ-hotspot" data-selected={selected} data-status={organ.status} key={organ.key} onClick={() => controller.setSelectedOrganKey(organ.key)} style={{ left: `${visual.x}%`, top: `${visual.y}%`, "--organ-color": visual.color } as React.CSSProperties} type="button">
            <span />{selected ? <b>{organ.name}<small>{statusLabel[organ.status]}</small></b> : null}
          </button>
        );
      })}
    </>
  );
}

function SurfaceNotes({ controller, dragged, viewIndex }: { controller: DashboardController; dragged: React.RefObject<boolean>; viewIndex: number }) {
  const view = views[viewIndex];
  const visibleNotes = controller.userState.bodyNotes.filter((note) => Math.round(note.angle / 90) % 4 === viewIndex);
  function createNote(event: MouseEvent<HTMLButtonElement>): void {
    if (dragged.current) { dragged.current = false; return; }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    const area = bodyRegionAt(x, y, view.angle);
    controller.openBodyNote({ area: t("body.notes.area", { area: t(`body.notes.region.${area.region}` as TranslationKey), view: t(`body.notes.view.${view.key}` as TranslationKey) }), angle: view.angle, x, y });
  }
  return (
    <>
      <button aria-label={t("body.notes.createAt", { view: t(`body.notes.view.${view.key}` as TranslationKey) })} className="surface-note-area" onClick={createNote} type="button" />
      {visibleNotes.map((note) => <span aria-label={t("body.notes.savedAt", { area: note.area })} className="saved-note-pin" key={note.id} role="img" style={{ left: `${note.x}%`, top: `${note.y}%` }} title={note.note} />)}
    </>
  );
}

function OrganIndex({ controller }: { controller: DashboardController }) {
  return (
    <aside className="organ-index">
      <header><h1>{t("body.organs.title")}</h1><p>{t("body.organs.description")}</p></header>
      <div aria-label={t("body.organs.title")} role="listbox">
      {controller.display.organs.map((organ) => (
        <button aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })} aria-selected={organ.key === controller.selectedOrganKey} key={organ.key} onClick={() => controller.setSelectedOrganKey(organ.key)} role="option" type="button">
          <span data-status={organ.status} /><span><strong>{organ.name}</strong><small>{organ.system}</small></span><Icon name="chevron" size={12} />
        </button>
      ))}
      </div>
    </aside>
  );
}
