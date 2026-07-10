import { useMemo } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "../../dashboard-format";
import { latestLabsByMarker, type LabResult, type SymptomEntry } from "../../dashboard-model";
import { t } from "../../i18n";

/* Compact page intro for Results and Symptoms. Replaces the previous
   overview-hero + stat tiles, which duplicated the Body workspace hero.
   Keeps the status lead and detail copy but renders them as a single
   bottom-bordered row so the page no longer repaints the Body hero. */
export function HistorySummary({
  tab,
  labs,
  symptoms,
  hasUnfilteredLabs,
  hasUnfilteredSymptoms,
  onClear,
  action,
}: {
  tab: string;
  labs: LabResult[];
  symptoms: SymptomEntry[];
  hasUnfilteredLabs: boolean;
  hasUnfilteredSymptoms: boolean;
  onClear: () => void;
  action?: React.ReactNode;
}) {
  if (tab === "symptoms") {
    return <SymptomSummary symptoms={symptoms} hasUnfiltered={hasUnfilteredSymptoms} onClear={onClear} action={action} />;
  }
  return <LabSummary labs={labs} hasUnfiltered={hasUnfilteredLabs} onClear={onClear} action={action} />;
}

function LabSummary({ labs, hasUnfiltered, onClear, action }: { labs: LabResult[]; hasUnfiltered: boolean; onClear: () => void; action?: React.ReactNode }) {
  const latestLabs = useMemo(() => latestLabsByMarker(labs), [labs]);
  const attention = latestLabs.filter((lab) => lab.status === "attention").length;
  const monitor = latestLabs.filter((lab) => lab.status === "monitor").length;
  const routine = Math.max(0, latestLabs.length - attention - monitor);
  const latestDate = latestOf(labs.map((lab) => lab.measuredAt));

  let lead: string;
  let detail: string;
  if (latestLabs.length === 0) {
    lead = hasUnfiltered ? t("history.summary.noResultsMatch") : t("history.summary.noResultsYet");
    detail = hasUnfiltered ? t("history.summary.clearToSee") : t("history.summary.addFirstResult");
  } else if (attention > 0) {
    lead = t(attention === 1 ? "history.summary.markerFollowUpSoon" : "history.summary.markersFollowUpSoon", { count: attention });
    detail = t("history.summary.followUpDetail");
  } else if (monitor > 0) {
    lead = t(monitor === 1 ? "history.summary.markerFollowUpMonitor" : "history.summary.markersFollowUpMonitor", { count: monitor });
    detail = t("history.summary.followUpDetail");
  } else {
    lead = t(latestLabs.length === 1 ? "history.summary.markerFollowUpRoutine" : "history.summary.markersFollowUpRoutine", { count: latestLabs.length });
    detail = t("history.summary.followUpDetail");
  }

  return <SummaryHero lead={lead} detail={detail} latestDate={latestDate} showClear={latestLabs.length === 0 && hasUnfiltered} onClear={onClear} action={action} metrics={[
    { status: "attention", label: t("lab.followUp.attention"), count: attention },
    { status: "monitor", label: t("lab.followUp.monitor"), count: monitor },
    { status: "normal", label: t("lab.followUp.normal"), count: routine },
  ]} />;
}

function SymptomSummary({ symptoms, hasUnfiltered, onClear, action }: { symptoms: SymptomEntry[]; hasUnfiltered: boolean; onClear: () => void; action?: React.ReactNode }) {
  const severe = symptoms.filter((symptom) => symptom.severity >= 4).length;
  const watch = symptoms.filter((symptom) => symptom.severity >= 2 && symptom.severity < 4).length;
  const mild = Math.max(0, symptoms.length - severe - watch);
  const latestDate = latestOf(symptoms.map((symptom) => symptom.observedAt));

  let lead: string;
  let detail: string;
  if (symptoms.length === 0) {
    lead = hasUnfiltered ? t("history.summary.noSymptomsMatch") : t("history.summary.noSymptomsYet");
    detail = hasUnfiltered ? t("history.summary.clearToSee") : t("history.summary.logSymptom");
  } else if (severe > 0) {
    lead = t(severe === 1 ? "history.summary.severeSymptom" : "history.summary.severeSymptoms", { count: severe });
    detail = t("history.summary.severeDetail");
  } else if (watch > 0) {
    lead = t(watch === 1 ? "history.summary.symptomWatch" : "history.summary.symptomsWatch", { count: watch });
    detail = t("history.summary.symptomsWatchDetail");
  } else {
    lead = t("history.summary.trackedMild", { count: symptoms.length });
    detail = t("history.summary.mildDetail");
  }

  return <SummaryHero lead={lead} detail={detail} latestDate={latestDate} showClear={symptoms.length === 0 && hasUnfiltered} onClear={onClear} action={action} metrics={[
    { status: "attention", label: t("status.attention"), count: severe },
    { status: "monitor", label: t("status.monitor"), count: watch },
    { status: "normal", label: t("status.normal"), count: mild },
  ]} />;
}

function SummaryHero({
  lead,
  detail,
  latestDate,
  showClear,
  onClear,
  action,
  metrics,
}: {
  lead: string;
  detail: string;
  latestDate: string;
  showClear: boolean;
  onClear: () => void;
  action?: React.ReactNode;
  metrics: Array<{ status: "normal" | "monitor" | "attention"; label: string; count: number }>;
}) {
  return (
    <div className="history-summary flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
      <div className="history-summary-lead min-w-0">
        <h2 className="text-base font-semibold">{lead}</h2>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="history-summary-metrics" aria-label={t("lab.followUp.label")}>
        {metrics.map((metric) => (
          <div className={`history-summary-metric status-${metric.status}`} key={metric.label}>
            <span className="status-dot" aria-hidden="true" />
            <span>
              <strong className="tnum">{metric.count}</strong>
              <small>{metric.label}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {action}
        {showClear ? <Button variant="link" size="sm" className="h-auto p-0" onClick={onClear}>{t("common.clearFilter")}</Button> : null}
        {latestDate ? <span className="text-xs text-muted-foreground">{t("body.hero.updated", { date: formatDate(latestDate) })}</span> : null}
      </div>
    </div>
  );
}

function latestOf(dates: string[]): string {
  return dates.reduce((latest, date) => (date > latest ? date : latest), "");
}
