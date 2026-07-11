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
    <section aria-label={t("body.anatomy.label")} className="grid min-h-0 min-w-0 grid-cols-[184px_minmax(0,1fr)] border-r border-border bg-surface max-[1040px]:grid-cols-[140px_minmax(0,1fr)] max-[880px]:grid-cols-[108px_minmax(0,1fr)]">
      <OrganIndex controller={controller} />
      <div className="relative min-h-0 min-w-0 overflow-hidden bg-[color-mix(in_srgb,var(--accent-soft)_34%,var(--surface-soft))]">
        <OrganView anatomy={anatomy} controller={controller} imageAlt={imageAlt} />
      </div>
    </section>
  );
}

function OrganView({ anatomy, controller, imageAlt }: { anatomy: string; controller: DashboardController; imageAlt: string }) {
  const visibleOrgans = controller.display.organs.filter((organ) => !wholeBodySystems.has(organ.key));
  return (
    <>
      <img alt={imageAlt} className="h-full w-full object-cover object-center [filter:saturate(0.8)_contrast(1.01)]" src={anatomy} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ink)_7%,transparent),transparent_20%,transparent_80%,color-mix(in_srgb,var(--ink)_10%,transparent))]" />
      {visibleOrgans.map((organ) => {
        const visual = getOrganVisual(organ.key);
        const selected = organ.key === controller.selectedOrganKey;
        return (
          <button
            aria-controls="selected-organ-details"
            aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })}
            aria-pressed={selected}
            className="absolute z-2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0 transition-[box-shadow] duration-[var(--dur-feedback)] ease-[var(--ease-out)] hover:[&>span]:size-[21px] data-[selected=true]:[&>span]:size-[21px] data-[selected=true]:[&>span]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--surface)_74%,transparent),0_1px_4px_color-mix(in_srgb,var(--ink)_30%,transparent)]"
            data-selected={selected}
            data-status={organ.status}
            key={organ.key}
            onClick={() => controller.setSelectedOrganKey(organ.key)}
            style={{ left: `${visual.x}%`, top: `${visual.y}%`, "--organ-color": visual.color } as React.CSSProperties}
            type="button"
          >
            <span className="absolute left-1/2 top-1/2 block size-[17px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-[var(--organ-color)] shadow-[0_1px_3px_color-mix(in_srgb,var(--ink)_28%,transparent)] transition-[width,height,box-shadow] duration-[var(--dur-feedback)] ease-[var(--ease-out)]" />
            {selected ? (
              <b className="absolute left-[26px] top-1/2 grid min-w-[108px] -translate-y-1/2 gap-px rounded-sm border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-[6px_8px] text-left text-xs shadow-[var(--elev-1)] backdrop-blur-[10px]">
                {organ.name}<small className="text-xs font-medium text-muted-ink">{statusLabel[organ.status]}</small>
              </b>
            ) : null}
          </button>
        );
      })}
    </>
  );
}

const statusDot = "size-[7px] rounded-full bg-quiet data-[status=normal]:bg-normal data-[status=monitor]:bg-monitor data-[status=attention]:bg-attention";
const statusLabelCls = "whitespace-nowrap text-[11px] font-semibold text-muted-ink data-[status=normal]:text-normal data-[status=monitor]:text-monitor data-[status=attention]:text-attention";

function OrganIndex({ controller }: { controller: DashboardController }) {
  return (
    <aside className="min-h-0 overflow-y-auto border-r border-border bg-sidebar">
      <header className="sticky top-0 z-2 bg-sidebar p-[20px_16px_12px] max-[1040px]:px-3">
        <h1 className="text-[0.9375rem] tracking-[-0.015em]">{t("body.organs.title")}</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-ink max-[880px]:hidden">{t("body.organs.description")}</p>
      </header>
      <div aria-label={t("body.organs.title")} className="pb-3 px-2" role="list">
        {controller.display.organs.map((organ) => (
          <button
            aria-label={t("body.anatomy.select", { organ: organ.name, status: statusLabel[organ.status] })}
            aria-pressed={organ.key === controller.selectedOrganKey}
            className="grid w-full min-h-[48px] grid-cols-[8px_minmax(0,1fr)_auto_12px] items-center gap-[7px] rounded-sm border-0 bg-transparent p-[7px] text-left text-ink transition-colors hover:bg-surface aria-pressed:bg-surface aria-pressed:shadow-[0_1px_2px_oklch(0.2_0.03_310/0.06)] max-[1040px]:grid-cols-[7px_minmax(0,1fr)_auto] max-[880px]:grid-cols-[7px_minmax(0,1fr)]"
            key={organ.key}
            onClick={() => controller.setSelectedOrganKey(organ.key)}
            type="button"
          >
            <span className={statusDot} data-status={organ.status} />
            <span className="grid min-w-0 gap-[2px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">{organ.name}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-ink max-[880px]:hidden">{organ.system}</small></span>
            <span className={`${statusLabelCls} max-[880px]:hidden`} data-status={organ.status}>{statusLabel[organ.status]}</span>
            <Icon className="text-quiet max-[1040px]:hidden" name="chevron" size={12} />
          </button>
        ))}
      </div>
    </aside>
  );
}
