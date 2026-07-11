import { getOrganVisual, statusLabel, wholeBodySystems } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

const anatomyDefault = new URL("../../assets/anatomy-body-dashboard.jpg", import.meta.url).href;
const anatomyFemale = new URL("../../assets/anatomy-body-women-dashboard.png", import.meta.url).href;

export function BodyCanvas({ controller }: { controller: DashboardController }) {
  const female = controller.userState.profile.anatomyModel === "female";
  const anatomy = female ? anatomyFemale : anatomyDefault;
  const imageAlt = female ? t("body.anatomy.altFemale") : t("body.anatomy.alt");

  return (
    <section className="anatomy-canvas" aria-label={t("body.anatomy.label")}>
      <OrganIndex controller={controller} />
      <div className="anatomy-stage">
        <OrganView anatomy={anatomy} controller={controller} imageAlt={imageAlt} />
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

function OrganIndex({ controller }: { controller: DashboardController }) {
  return (
    <aside className="organ-index">
      <header><h1>{t("body.organs.title")}</h1><p>{t("body.organs.description")}</p></header>
      <div aria-label={t("body.organs.title")} role="list">
      {controller.display.organs.map((organ) => (
        <button aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })} aria-pressed={organ.key === controller.selectedOrganKey} key={organ.key} onClick={() => controller.setSelectedOrganKey(organ.key)} type="button">
          <span data-status={organ.status} /><span><strong>{organ.name}</strong><small>{organ.system}</small></span><span className="organ-status-label" data-status={organ.status}>{statusLabel[organ.status]}</span><Icon name="chevron" size={12} />
        </button>
      ))}
      </div>
    </aside>
  );
}
