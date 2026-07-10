import { lazy, Suspense } from "react";
import { statusLabel } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

const ConditionsCard = lazy(() => import("./conditions-card").then((module) => ({ default: module.ConditionsCard })));

export function OrganInspector({ controller }: { controller: DashboardController }) {
  const organ = controller.selectedOrgan;
  const recordCount = controller.organLabs.length + controller.organSymptoms.length + controller.organConditions.length;
  const summaryKey = recordCount === 0 ? "body.summary.empty" : `body.summary.${organ.status}` as const;
  return (
    <article className="inspector" id="selected-organ-details">
      <header className="inspector-heading">
        <div className="inspector-path"><span>{organ.system}</span><Icon name="chevron" size={11} /><span>{t("body.recent.title")}</span></div>
        <div className="inspector-title-row"><h1>{organ.name}</h1><span className="status-pill" data-status={organ.status}><i />{statusLabel[organ.status]}</span></div>
        <p>{t(summaryKey, { organ: organ.name })}</p>
        <div className="record-counts" aria-label={t("body.organ.linkedRecords", { count: recordCount })}>
          <span><strong>{controller.organLabs.length}</strong>{t("workspace.timeline.results")}</span>
          <span><strong>{controller.organSymptoms.length}</strong>{t("workspace.timeline.symptoms")}</span>
          <span><strong>{controller.organConditions.length}</strong>{t("workspace.timeline.conditions")}</span>
        </div>
      </header>

      <div className="quick-actions" aria-label={t("common.add")}>
        <button onClick={() => controller.openDialog("lab")} type="button"><span><Icon name="labs" size={16} /></span><strong>{t("intake.title.result")}</strong><small>{organ.name}</small></button>
        <button onClick={() => controller.openDialog("symptom")} type="button"><span><Icon name="symptom" size={16} /></span><strong>{t("body.detail.logSymptom")}</strong><small>{organ.name}</small></button>
      </div>

      <section className="inspector-section">
        <div className="section-title"><h2>{t("body.inspector.recent")}</h2><button onClick={() => controller.setSelectedNav("labs")} type="button">{t("workspace.timeline")}<Icon name="chevron" size={13} /></button></div>
        <RecentSignals controller={controller} />
      </section>

      <details className="conditions-disclosure">
        <summary><span>{t("conditions.title")}</span><strong>{controller.organConditions.length}</strong><Icon name="chevron" size={13} /></summary>
        <Suspense fallback={null}><ConditionsCard controller={controller} /></Suspense>
      </details>

      <section className="inspector-section daily-context">
        <div className="section-title"><h2>{t("body.recent.dailyLog")}</h2><button onClick={() => controller.openDialog("activity")} type="button">{t("body.recent.add")}<Icon name="plus" size={13} /></button></div>
        <DailyContext controller={controller} />
      </section>
      <footer className="inspector-footer"><Icon name="lock" size={13} />{t("database.localRecords")}</footer>
    </article>
  );
}

function RecentSignals({ controller }: { controller: DashboardController }) {
  const rows = [
    ...controller.organLabs.slice(0, 3).map((item) => ({ id: `lab-${item.id}`, icon: "labs" as const, title: item.marker, meta: item.measuredAt, value: [item.value, item.unit].filter(Boolean).join(" "), status: item.status })),
    ...controller.organSymptoms.slice(0, 2).map((item) => ({ id: `symptom-${item.id}`, icon: "symptom" as const, title: item.name, meta: item.observedAt, value: `${item.severity}/5`, status: item.severity >= 4 ? "attention" as const : item.severity >= 2 ? "monitor" as const : "normal" as const })),
  ].sort((a, b) => b.meta.localeCompare(a.meta));
  if (!rows.length) return <div className="empty-record"><Icon name="activity" size={17} /><p>{t("body.recent.noResults")}</p></div>;
  return <div className="signal-list">{rows.map((row) => (
    <div className="record-row" key={row.id}><span className="record-icon" data-status={row.status}><Icon name={row.icon} size={14} /></span><span><strong>{row.title}</strong><small>{row.meta}</small></span><b>{row.value}</b></div>
  ))}</div>;
}

function DailyContext({ controller }: { controller: DashboardController }) {
  const entries = controller.userState.activityEntries.slice(0, 2);
  if (!entries.length) return <div className="empty-record"><Icon name="activity" size={17} /><p>{t("body.recent.noDailyEntries")}</p></div>;
  return <div className="signal-list">{entries.map((entry) => (
    <div className="record-row daily-row" key={entry.id}><span className="record-icon"><Icon name="activity" size={14} /></span><span><strong>{entry.activityName || t("body.recent.dailyEntry")}</strong><small>{entry.loggedAt}</small></span></div>
  ))}</div>;
}
