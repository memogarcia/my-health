import { lazy, Suspense, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthStatus } from "../dashboard-model";
import { statusLabel } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { formatElapsed } from "./fasting-format";
import { Icon, type IconName } from "./icon";

const HistoryPage = lazy(() => import("./history-page").then((module) => ({ default: module.HistoryPage })));

type TimelineFilter = "all" | "results" | "symptoms" | "conditions" | "regimen" | "diet" | "fasting" | "notes";
type TimelineItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
  kind: Exclude<TimelineFilter, "all">;
  icon: IconName;
  status?: HealthStatus;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteConfirm?: string;
};

const filters: Array<{ key: TimelineFilter; label: string }> = [
  { key: "all", label: t("workspace.timeline.all") },
  { key: "results", label: t("workspace.timeline.results") },
  { key: "symptoms", label: t("workspace.timeline.symptoms") },
  { key: "conditions", label: t("workspace.timeline.conditions") },
  { key: "regimen", label: t("workspace.timeline.regimen") },
  { key: "diet", label: t("workspace.timeline.diet") },
  { key: "fasting", label: t("workspace.timeline.fasting") },
  { key: "notes", label: t("workspace.timeline.notes") },
];

const nodeStatus =
  "data-[status=normal]:text-[color-mix(in_srgb,var(--normal)_88%,var(--ink))] data-[status=normal]:bg-[color-mix(in_srgb,var(--normal)_11%,var(--surface))] data-[status=monitor]:text-[color-mix(in_srgb,var(--monitor)_88%,var(--ink))] data-[status=monitor]:bg-[color-mix(in_srgb,var(--monitor)_12%,var(--surface))] data-[status=attention]:text-[color-mix(in_srgb,var(--attention)_88%,var(--ink))] data-[status=attention]:bg-[color-mix(in_srgb,var(--attention)_10%,var(--surface))]";
const dotStatus = "size-[5px] rounded-full data-[status=normal]:bg-normal data-[status=monitor]:bg-monitor data-[status=attention]:bg-attention data-[status=empty]:bg-quiet";

export function UnifiedTimeline({ controller }: { controller: DashboardController }) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [manage, setManage] = useState(false);
  const items = useMemo(() => buildTimeline(controller), [controller.display, controller.userState]);
  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);

  function selectFilter(next: TimelineFilter): void {
    setFilter(next);
    setManage(false);
    if (next === "results") controller.setActiveHistoryTab("labs");
    if (next === "symptoms") controller.setActiveHistoryTab("symptoms");
  }

  const canManage = filter === "results" || filter === "symptoms";
  return (
    <section className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas">
      <header className="mx-auto flex max-w-[864px] items-start justify-between gap-5 px-7 pb-3 pt-5 max-[880px]:px-[var(--page-gutter)]">
        <div>
          <h1 className="text-xl tracking-[-0.02em]">{t("workspace.timeline")}</h1>
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-ink">{t("workspace.timelineHint")}</p>
        </div>
        <div className="flex gap-1">
          {canManage ? <Button size="sm" variant="ghost" onClick={() => setManage((value) => !value)} type="button">{manage ? t("workspace.timeline.return") : t("workspace.timeline.manage")}</Button> : null}
          <Button size="sm" variant="ghost" onClick={() => controller.setSelectedNav("activity")} type="button"><Icon name="activity" size={15} />{t("nav.activity.label")}</Button>
          <Button size="sm" variant="ghost" onClick={() => controller.openDialog("symptom")} type="button"><Icon name="symptom" size={15} />{t("body.detail.logSymptom")}</Button>
        </div>
      </header>
      <div aria-label={t("workspace.timeline.filter")} className="sticky top-0 z-[4] mx-auto flex max-w-[864px] gap-1 overflow-x-auto border-b border-border bg-canvas pb-3 max-[880px]:mx-[var(--page-gutter)]" role="group">
        {filters.map((item) => (
          <button
            aria-pressed={filter === item.key}
            className="min-w-max min-h-8 rounded-sm border-0 bg-transparent px-2.5 text-xs font-semibold text-muted-ink transition-colors hover:bg-secondary hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink"
            key={item.key}
            onClick={() => selectFilter(item.key)}
            type="button"
          >{item.label}</button>
        ))}
      </div>
      {manage && canManage ? (
        <div className="mx-auto max-w-[960px] px-7 pb-8 pt-5 max-[880px]:px-[var(--page-gutter)]">
          <Suspense fallback={<div className="grid gap-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-72 w-full" /></div>}>
            <HistoryPage controller={controller} />
          </Suspense>
        </div>
      ) : <TimelineReading items={visible} />}
    </section>
  );
}

function TimelineReading({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <div className="mx-auto grid min-h-[340px] max-w-[864px] place-items-center content-center py-8 text-center text-muted-ink max-[880px]:mx-[var(--page-gutter)]"><Icon name="activity" size={22} /><h2 className="mt-3 text-[0.9375rem] text-ink">{t("workspace.timeline.empty")}</h2><p className="mt-1 max-w-[46ch] text-sm leading-relaxed">{t("workspace.timeline.emptyHint")}</p></div>;
  let previousDate = "";
  return (
    <div className="mx-auto max-w-[864px] pb-8 pt-5 max-[880px]:mx-[var(--page-gutter)]">
      {items.map((item, index) => {
        const showDate = item.date !== previousDate;
        previousDate = item.date;
        const isLast = index === items.length - 1;
        return (
          <div className="grid min-h-[74px] grid-cols-[92px_30px_minmax(0,1fr)]" key={item.id}>
            <time className="pt-[14px] pr-3 text-right text-xs font-semibold tabular-nums text-muted-ink">{showDate ? item.date : ""}</time>
            <span className={`relative z-[1] mt-[6px] grid size-7 place-items-center rounded-sm bg-secondary text-muted-ink ${nodeStatus}`} data-status={item.status || "neutral"}>
              <Icon name={item.icon} size={15} />
              {isLast ? null : <span aria-hidden="true" className="absolute left-1/2 top-7 -bottom-9 -z-[1] w-px -translate-x-1/2 bg-border" />}
            </span>
            <div className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border transition-colors hover:bg-secondary">
              <button className="grid min-h-[63px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-0 bg-transparent p-[10px_8px_12px_12px] text-left text-ink" onClick={item.onOpen} type="button">
                <span className="flex min-w-0 items-baseline gap-2"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">{item.title}</strong><small className="text-xs text-muted-ink">{labelForKind(item.kind)}</small></span>
                <p className="col-start-1 mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-ink">{item.detail}</p>
                {item.status ? <em className="col-start-2 row-span-2 inline-flex items-center gap-[5px] rounded-full bg-secondary px-[7px] py-1 text-xs font-semibold not-italic text-muted-ink" data-status={item.status}><i className={dotStatus} data-status={item.status} />{statusLabel[item.status]}</em> : null}
              </button>
              {item.onEdit || item.onDelete ? (
                <div className="flex gap-0.5 pr-2">
                  {item.onEdit ? <Button aria-label={t("workspace.timeline.editEntry", { title: item.title })} onClick={item.onEdit} size="icon-xs" type="button" variant="ghost"><Pencil /></Button> : null}
                  {item.onDelete ? <Button aria-label={t("workspace.timeline.deleteEntry", { title: item.title })} onClick={() => {
                    if (!item.deleteConfirm || window.confirm(item.deleteConfirm)) item.onDelete?.();
                  }} size="icon-xs" type="button" variant="destructive"><Trash2 /></Button> : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildTimeline(controller: DashboardController): TimelineItem[] {
  const openOrgan = (organKey: string) => { controller.setSelectedOrganKey(organKey); controller.setSelectedNav("body"); };
  const results = controller.display.latestLabResults.map((item) => ({ id: `result-${item.id}`, date: item.measuredAt, title: item.marker, detail: [item.value, item.unit, organName(controller, item.organKey)].filter(Boolean).join(" · "), kind: "results" as const, icon: "labs" as const, status: item.status, onOpen: () => openOrgan(item.organKey) }));
  const symptoms = controller.display.recentSymptoms.map((item) => ({ id: `symptom-${item.id}`, date: item.observedAt, title: item.name, detail: t("workspace.timeline.severity", { severity: item.severity, organ: organName(controller, item.organKey) }), kind: "symptoms" as const, icon: "symptom" as const, status: item.severity >= 4 ? "attention" as const : item.severity >= 2 ? "monitor" as const : "normal" as const, onOpen: () => openOrgan(item.organKey) }));
  const conditions = controller.display.conditions.map((item) => ({ id: `condition-${item.id}`, date: item.diagnosedAt, title: item.name, detail: `${organName(controller, item.organKey)} · ${item.status}`, kind: "conditions" as const, icon: "heart" as const, onOpen: () => openOrgan(item.organKey) }));
  const regimen = controller.display.regimenItems.map((item) => ({ id: `regimen-${item.id}`, date: item.startDate, title: item.name, detail: [item.dose, item.unit, item.frequency].filter(Boolean).join(" · "), kind: "regimen" as const, icon: "medication" as const, onOpen: () => controller.setSelectedNav("medications") }));
  const activities = controller.userState.activityEntries.map((item) => ({
    id: `activity-${item.id}`,
    date: item.loggedAt,
    title: item.activityName || t("body.recent.dailyEntry"),
    detail: item.notes || t("workspace.timeline.activityDetail", { minutes: item.durationMinutes }),
    kind: "notes" as const,
    icon: "activity" as const,
    onOpen: () => controller.editActivity(item),
    onEdit: () => controller.editActivity(item),
    onDelete: () => void controller.deleteActivity(item.id),
    deleteConfirm: t("intake.activity.deleteConfirm"),
  }));
  const diet = controller.userState.dietEntries.map((item) => ({
    id: `diet-${item.id}`,
    date: item.loggedAt,
    title: item.title,
    detail: [t(`diet.meal.${item.meal}`), item.notes].filter(Boolean).join(" · "),
    kind: "diet" as const,
    icon: "diet" as const,
    onOpen: () => controller.setSelectedNav("diet"),
    onDelete: () => void controller.deleteDietEntry(item.id),
    deleteConfirm: t("diet.deleteConfirm"),
  }));
  const fasting = controller.userState.fasting.sessions.map((item) => {
    const duration = Math.max(0, Math.floor((Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 1000));
    return {
      id: `fasting-${item.id}`,
      date: localDateString(item.endedAt),
      title: t("workspace.timeline.fastingTitle", { hours: item.targetHours }),
      detail: t("workspace.timeline.fastingDetail", { duration: formatElapsed(duration) }),
      kind: "fasting" as const,
      icon: "timer" as const,
      onOpen: () => controller.setSelectedNav("fasting"),
      onDelete: () => void controller.deleteFastingSession(item.id),
      deleteConfirm: t("fasting.history.deleteConfirm"),
    };
  });
  const bodyNotes = controller.userState.bodyNotes.map((item) => ({ id: `note-${item.id}`, date: item.createdAt.slice(0, 10), title: item.area, detail: item.note, kind: "notes" as const, icon: "body" as const, onOpen: () => controller.editBodyNote(item), onEdit: () => controller.editBodyNote(item), onDelete: () => void controller.deleteBodyNote(item.id), deleteConfirm: t("body.notes.deleteConfirm") }));
  return [...results, ...symptoms, ...conditions, ...regimen, ...activities, ...diet, ...fasting, ...bodyNotes].sort((a, b) => b.date.localeCompare(a.date));
}

function localDateString(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function organName(controller: DashboardController, key: string): string {
  return controller.display.organs.find((organ) => organ.key === key)?.name || key;
}

function labelForKind(kind: Exclude<TimelineFilter, "all">): string {
  return filters.find((item) => item.key === kind)?.label || kind;
}
