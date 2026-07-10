import { useMemo, useState } from "react";
import type { HealthStatus } from "../dashboard-model";
import { statusLabel } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { HistoryPage } from "./history-page";
import { Icon, type IconName } from "./icon";

type TimelineFilter = "all" | "results" | "symptoms" | "conditions" | "regimen" | "notes";
type TimelineItem = { id: string; date: string; title: string; detail: string; kind: Exclude<TimelineFilter, "all">; icon: IconName; status?: HealthStatus; organKey?: string };

const filters: Array<{ key: TimelineFilter; label: string }> = [
  { key: "all", label: t("workspace.timeline.all") },
  { key: "results", label: t("workspace.timeline.results") },
  { key: "symptoms", label: t("workspace.timeline.symptoms") },
  { key: "conditions", label: t("workspace.timeline.conditions") },
  { key: "regimen", label: t("workspace.timeline.regimen") },
  { key: "notes", label: t("workspace.timeline.notes") },
];

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
    <section className="timeline-workspace">
      <header className="timeline-header">
        <div><h1>{t("workspace.timeline")}</h1><p>{t("workspace.timelineHint")}</p></div>
        <div className="timeline-actions">
          {canManage ? <button className="quiet-button" onClick={() => setManage((value) => !value)} type="button">{manage ? t("workspace.timeline.return") : t("workspace.timeline.manage")}</button> : null}
          <button className="quiet-button" onClick={() => controller.openDialog("symptom")} type="button"><Icon name="symptom" size={15} />{t("body.detail.logSymptom")}</button>
        </div>
      </header>
      <div className="timeline-filter" role="tablist" aria-label={t("workspace.timeline.filter")}>
        {filters.map((item) => <button aria-selected={filter === item.key} key={item.key} onClick={() => selectFilter(item.key)} role="tab" type="button">{item.label}</button>)}
      </div>
      {manage && canManage ? <div className="timeline-manage"><HistoryPage controller={controller} /></div> : <TimelineReading items={visible} controller={controller} />}
    </section>
  );
}

function TimelineReading({ items, controller }: { items: TimelineItem[]; controller: DashboardController }) {
  if (!items.length) return <div className="timeline-empty"><Icon name="activity" size={22} /><h2>{t("workspace.timeline.empty")}</h2><p>{t("workspace.timeline.emptyHint")}</p></div>;
  let previousDate = "";
  return (
    <div className="timeline-reading">
      {items.map((item) => {
        const showDate = item.date !== previousDate;
        previousDate = item.date;
        return (
          <div className="timeline-entry" key={item.id}>
            <time>{showDate ? item.date : ""}</time>
            <span className="timeline-node" data-status={item.status || "neutral"}><Icon name={item.icon} size={15} /></span>
            <button onClick={() => { if (item.organKey) { controller.setSelectedOrganKey(item.organKey); controller.setSelectedNav("body"); } }} type="button">
              <span><strong>{item.title}</strong><small>{labelForKind(item.kind)}</small></span>
              <p>{item.detail}</p>
              {item.status ? <em data-status={item.status}><i />{statusLabel[item.status]}</em> : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function buildTimeline(controller: DashboardController): TimelineItem[] {
  const results = controller.display.latestLabResults.map((item) => ({ id: `result-${item.id}`, date: item.measuredAt, title: item.marker, detail: [item.value, item.unit, organName(controller, item.organKey)].filter(Boolean).join(" · "), kind: "results" as const, icon: "labs" as const, status: item.status, organKey: item.organKey }));
  const symptoms = controller.display.recentSymptoms.map((item) => ({ id: `symptom-${item.id}`, date: item.observedAt, title: item.name, detail: t("workspace.timeline.severity", { severity: item.severity, organ: organName(controller, item.organKey) }), kind: "symptoms" as const, icon: "symptom" as const, status: item.severity >= 4 ? "attention" as const : item.severity >= 2 ? "monitor" as const : "normal" as const, organKey: item.organKey }));
  const conditions = controller.display.conditions.map((item) => ({ id: `condition-${item.id}`, date: item.diagnosedAt, title: item.name, detail: `${organName(controller, item.organKey)} · ${item.status}`, kind: "conditions" as const, icon: "heart" as const, organKey: item.organKey }));
  const regimen = controller.display.regimenItems.map((item) => ({ id: `regimen-${item.id}`, date: item.startDate, title: item.name, detail: [item.dose, item.unit, item.frequency].filter(Boolean).join(" · "), kind: "regimen" as const, icon: "medication" as const }));
  const bodyNotes = controller.userState.bodyNotes.map((item) => ({ id: `note-${item.id}`, date: item.createdAt.slice(0, 10), title: item.area, detail: item.note, kind: "notes" as const, icon: "body" as const }));
  const daily = controller.userState.activityEntries.map((item) => ({ id: `daily-${item.id}`, date: item.loggedAt.slice(0, 10), title: item.activityName || t("body.recent.dailyEntry"), detail: item.notes || t("appShell.dailyLog"), kind: "notes" as const, icon: "activity" as const }));
  return [...results, ...symptoms, ...conditions, ...regimen, ...bodyNotes, ...daily].sort((a, b) => b.date.localeCompare(a.date));
}

function organName(controller: DashboardController, key: string): string {
  return controller.display.organs.find((organ) => organ.key === key)?.name || key;
}

function labelForKind(kind: Exclude<TimelineFilter, "all">): string {
  return filters.find((item) => item.key === kind)?.label || kind;
}
