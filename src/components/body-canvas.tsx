import { getOrganVisual, statusLabel, wholeBodySystems } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

const anatomyMale = new URL("../../assets/anatomy-body-dashboard.png", import.meta.url).href;
const anatomyFemale = new URL("../../assets/anatomy-body-women-dashboard.png", import.meta.url).href;

export function BodyCanvas({ controller }: { controller: DashboardController }) {
  const female = controller.userState.profile.anatomyModel === "female";
  const anatomy = female ? anatomyFemale : anatomyMale;
  const imageAlt = female ? t("body.anatomy.altFemale") : t("body.anatomy.altMale");

  return (
    <section aria-label={t("body.anatomy.label")} className="grid min-h-0 min-w-0 grid-cols-[184px_minmax(0,1fr)] border-r border-border bg-canvas max-[1040px]:grid-cols-[140px_minmax(0,1fr)] max-[880px]:grid-cols-[124px_minmax(0,1fr)]">
      <OrganIndex controller={controller} />
      <div className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-canvas">
        <OrganView anatomy={anatomy} controller={controller} female={female} imageAlt={imageAlt} />
      </div>
    </section>
  );
}

function OrganView({ anatomy, controller, female, imageAlt }: { anatomy: string; controller: DashboardController; female: boolean; imageAlt: string }) {
  const visibleOrgans = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  return (
    <div className="absolute left-1/2 top-1/2 h-full aspect-[3/2] -translate-x-1/2 -translate-y-1/2">
      <img alt={imageAlt} className="h-full w-full object-cover object-center [filter:var(--anatomy-filter)]" draggable={false} src={anatomy} />
      <div className="pointer-events-none absolute inset-0 [background-image:var(--anatomy-overlay)]" />
      {visibleOrgans.map((organ) => {
        const visual = getOrganVisual(organ.key, female ? "female" : "male");
        if (!visual) return null;
        const selected = organ.key === controller.selectedOrganKey;
        return (
          <button
            aria-controls="selected-organ-details"
            aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })}
            aria-pressed={selected}
            className="group absolute z-2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0 transition-[box-shadow] duration-[var(--dur-feedback)] ease-[var(--ease-out)] hover:[&>span]:size-[21px] data-[selected=true]:[&>span]:size-[21px] data-[selected=true]:[&>span]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--surface)_78%,transparent),0_1px_4px_color-mix(in_srgb,var(--ink)_30%,transparent)]"
            data-selected={selected}
            data-status={organ.status}
            key={organ.key}
            onClick={() => controller.setSelectedOrganKey(organ.key)}
            style={{ left: `${visual.x}%`, top: `${visual.y}%` }}
            type="button"
          >
            <span className="absolute left-1/2 top-1/2 block size-[17px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-quiet shadow-[0_1px_3px_color-mix(in_srgb,var(--ink)_28%,transparent)] transition-[width,height,box-shadow] duration-[var(--dur-feedback)] ease-[var(--ease-out)] group-data-[status=normal]:bg-normal group-data-[status=monitor]:bg-monitor group-data-[status=attention]:bg-attention" />
            {selected ? (
              <b className={`absolute top-1/2 grid min-w-[108px] -translate-y-1/2 gap-px rounded-sm border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-[6px_8px] text-left text-xs shadow-[var(--elev-1)] backdrop-blur-[10px] ${visual.x > 55 ? "right-[26px]" : "left-[26px]"}`}>
                {organ.name}<small className="text-xs font-medium text-muted-ink">{statusLabel[organ.status]}</small>
              </b>
            ) : null}
          </button>
        );
      })}
      {wholeBodySystems.has(controller.selectedOrganKey) ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-surface px-3 py-2 text-center shadow-[var(--elev-1)] ring-1 ring-border/45">
          <strong className="block text-xs text-ink">{controller.selectedOrgan.name}</strong>
          <span className="mt-0.5 block text-[11px] text-muted-ink">{t("body.organs.wholeBody")}</span>
        </div>
      ) : null}
    </div>
  );
}

const statusDot = "size-[7px] rounded-full bg-quiet data-[status=normal]:bg-normal data-[status=monitor]:bg-monitor data-[status=attention]:bg-attention max-[880px]:row-span-2";
const statusLabelCls = "whitespace-nowrap text-[11px] font-semibold text-muted-ink data-[status=normal]:text-normal data-[status=monitor]:text-monitor data-[status=attention]:text-attention max-[880px]:col-start-2 max-[880px]:row-start-2";

function OrganIndex({ controller }: { controller: DashboardController }) {
  const localized = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  const systems = controller.display.organs.filter((organ) => wholeBodySystems.has(organ.key));
  return (
    <aside className="min-h-0 overflow-y-auto border-r border-border bg-canvas">
      <header className="sticky top-0 z-2 bg-canvas p-[20px_16px_12px] max-[1040px]:px-3">
        <h1 className="text-[0.9375rem] tracking-[-0.015em]">{t("body.organs.title")}</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-ink max-[880px]:hidden">{t("body.organs.description")}</p>
      </header>
      <div aria-label={t("body.organs.title")} className="pb-3 px-2" role="list">
        <OrganRows controller={controller} organs={localized} />
        {systems.length ? <p className="px-2 pb-1 pt-3 text-[10px] font-semibold text-quiet max-[880px]:sr-only">{t("body.organs.wholeBody")}</p> : null}
        <OrganRows controller={controller} organs={systems} />
      </div>
    </aside>
  );
}

function OrganRows({ controller, organs }: { controller: DashboardController; organs: DashboardController["display"]["organs"] }) {
  return organs.map((organ) => (
    <button aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })} aria-pressed={organ.key === controller.selectedOrganKey} className="grid min-h-[48px] w-full grid-cols-[8px_minmax(0,1fr)_auto_12px] items-center gap-[7px] rounded-sm border-0 bg-transparent p-[7px] text-left text-ink transition-colors hover:bg-surface aria-pressed:bg-surface aria-pressed:shadow-[var(--elev-1)] max-[1040px]:grid-cols-[7px_minmax(0,1fr)_auto] max-[880px]:grid-cols-[7px_minmax(0,1fr)]" key={organ.key} onClick={() => controller.setSelectedOrganKey(organ.key)} type="button">
      <span className={statusDot} data-status={organ.status} />
      <span className="grid min-w-0 gap-[2px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">{organ.name}</strong></span>
      <span className={statusLabelCls} data-status={organ.status}>{statusLabel[organ.status]}</span>
      <Icon className="text-quiet max-[1040px]:hidden" name="chevron" size={12} />
    </button>
  ));
}
