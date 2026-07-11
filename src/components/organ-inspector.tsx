import { lazy, Suspense } from "react";
import { statusLabel } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

const ConditionsCard = lazy(() => import("./conditions-card").then((module) => ({ default: module.ConditionsCard })));

const pillStatus =
  "data-[status=normal]:text-[color-mix(in_srgb,var(--normal)_88%,var(--ink))] data-[status=normal]:bg-[color-mix(in_srgb,var(--normal)_12%,var(--surface))] data-[status=monitor]:text-[color-mix(in_srgb,var(--monitor)_88%,var(--ink))] data-[status=monitor]:bg-[color-mix(in_srgb,var(--monitor)_13%,var(--surface))] data-[status=attention]:text-[color-mix(in_srgb,var(--attention)_88%,var(--ink))] data-[status=attention]:bg-[color-mix(in_srgb,var(--attention)_11%,var(--surface))] data-[status=empty]:text-muted-ink data-[status=empty]:bg-secondary";
const dotStatus =
  "size-[5px] rounded-full data-[status=normal]:bg-normal data-[status=monitor]:bg-monitor data-[status=attention]:bg-attention data-[status=empty]:bg-quiet";
const iconStatus =
  "data-[status=normal]:text-[color-mix(in_srgb,var(--normal)_88%,var(--ink))] data-[status=normal]:bg-[color-mix(in_srgb,var(--normal)_11%,var(--surface))] data-[status=monitor]:text-[color-mix(in_srgb,var(--monitor)_88%,var(--ink))] data-[status=monitor]:bg-[color-mix(in_srgb,var(--monitor)_12%,var(--surface))] data-[status=attention]:text-[color-mix(in_srgb,var(--attention)_88%,var(--ink))] data-[status=attention]:bg-[color-mix(in_srgb,var(--attention)_10%,var(--surface))]";

export function OrganInspector({ controller }: { controller: DashboardController }) {
  const organ = controller.selectedOrgan;
  const recordCount = controller.organLabs.length + controller.organSymptoms.length + controller.organConditions.length;
  const summaryKey = recordCount === 0 ? "body.summary.empty" : `body.summary.${organ.status}` as const;
  return (
    <article className="min-h-0 min-w-0 overflow-y-auto bg-canvas pb-4 px-7 pt-6 max-[880px]:pb-3 max-[880px]:px-4 max-[880px]:pt-5" id="selected-organ-details">
      <header className="border-b border-border pb-5">
        <div className="flex items-center gap-1 text-xs text-muted-ink"><span>{organ.system}</span><Icon name="chevron" size={11} /><span>{t("body.recent.title")}</span></div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl leading-[1.08] tracking-[-0.025em] max-[880px]:text-xl">{organ.name}</h1>
          <span className={`inline-flex w-max items-center gap-[5px] rounded-full px-[7px] py-1 text-xs font-bold ${pillStatus}`} data-status={organ.status}>
            <i className={dotStatus} data-status={organ.status} />
            {statusLabel[organ.status]}
          </span>
        </div>
        <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted-ink">{t(summaryKey, { organ: organ.name })}</p>
        <div aria-label={t("body.organ.linkedRecords", { count: recordCount })} className="mt-4 flex gap-5 max-[880px]:gap-3">
          <span className="grid gap-[2px] text-xs text-muted-ink"><strong className="text-lg tabular-nums text-ink">{controller.organLabs.length}</strong>{t("workspace.timeline.results")}</span>
          <span className="grid gap-[2px] text-xs text-muted-ink"><strong className="text-lg tabular-nums text-ink">{controller.organSymptoms.length}</strong>{t("workspace.timeline.symptoms")}</span>
          <span className="grid gap-[2px] text-xs text-muted-ink"><strong className="text-lg tabular-nums text-ink">{controller.organConditions.length}</strong>{t("workspace.timeline.conditions")}</span>
        </div>
      </header>

      <div aria-label={t("common.add")} className="mb-1 mt-4 grid grid-cols-2 gap-2">
        <button className="grid min-h-[54px] grid-cols-[28px_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-2 gap-y-0 rounded-lg border border-border bg-surface p-2 text-left text-ink transition-colors hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--hairline))] hover:bg-accent" onClick={() => controller.openDialog("lab")} type="button">
          <span className="grid size-7 row-span-2 place-items-center rounded-sm bg-accent text-accent-ink"><Icon name="labs" size={16} /></span>
          <strong className="self-end overflow-hidden text-ellipsis whitespace-nowrap text-xs">{t("intake.title.result")}</strong>
          <small className="self-start overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-ink">{organ.name}</small>
        </button>
        <button className="grid min-h-[54px] grid-cols-[28px_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-2 gap-y-0 rounded-lg border border-border bg-surface p-2 text-left text-ink transition-colors hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--hairline))] hover:bg-accent" onClick={() => controller.openDialog("symptom")} type="button">
          <span className="grid size-7 row-span-2 place-items-center rounded-sm bg-accent text-accent-ink"><Icon name="symptom" size={16} /></span>
          <strong className="self-end overflow-hidden text-ellipsis whitespace-nowrap text-xs">{t("body.detail.logSymptom")}</strong>
          <small className="self-start overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-ink">{organ.name}</small>
        </button>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm">{t("body.inspector.recent")}</h2>
          <button className="flex min-h-7 items-center gap-0.5 border-0 bg-transparent text-xs font-semibold text-accent-ink" onClick={() => controller.setSelectedNav("labs")} type="button">{t("workspace.timeline")}<Icon name="chevron" size={13} /></button>
        </div>
        <RecentSignals controller={controller} />
      </section>

      <details className="mt-5 border-b border-t border-border">
        <summary className="grid min-h-[44px] cursor-default grid-cols-[1fr_auto_13px] items-center gap-2 text-sm font-semibold list-none [&::-webkit-details-marker]:hidden">
          <span>{t("conditions.title")}</span>
          <strong className="grid size-5 place-items-center rounded-full bg-secondary text-xs text-muted-ink">{controller.organConditions.length}</strong>
          <span className="open:rotate-90 transition-transform"><Icon name="chevron" size={13} /></span>
        </summary>
        <Suspense fallback={null}><ConditionsCard controller={controller} showHeading={false} /></Suspense>
      </details>

    </article>
  );
}

function RecentSignals({ controller }: { controller: DashboardController }) {
  const rows = [
    ...controller.organLabs.slice(0, 3).map((item) => ({ id: `lab-${item.id}`, icon: "labs" as const, title: item.marker, meta: item.measuredAt, value: [item.value, item.unit].filter(Boolean).join(" "), status: item.status })),
    ...controller.organSymptoms.slice(0, 2).map((item) => ({ id: `symptom-${item.id}`, icon: "symptom" as const, title: item.name, meta: item.observedAt, value: `${item.severity}/5`, status: item.severity >= 4 ? "attention" as const : item.severity >= 2 ? "monitor" as const : "normal" as const })),
  ].sort((a, b) => b.meta.localeCompare(a.meta));
  if (!rows.length) return <div className="flex min-h-[54px] items-center gap-2 py-3 text-muted-ink"><Icon name="activity" size={17} /><p className="text-sm leading-relaxed">{t("body.recent.noResults")}</p></div>;
  return (
    <div className="border-t border-border">
      {rows.map((row) => (
        <div className="grid min-h-[52px] grid-cols-[29px_minmax(0,1fr)_auto] items-center gap-2 border-b border-border py-2" key={row.id}>
          <span className={`grid size-[27px] place-items-center rounded-sm ${iconStatus}`} data-status={row.status}><Icon name={row.icon} size={14} /></span>
          <span className="grid min-w-0 gap-[2px]"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">{row.title}</strong><small className="text-xs text-muted-ink">{row.meta}</small></span>
          <b className="text-sm tabular-nums">{row.value}</b>
        </div>
      ))}
    </div>
  );
}
