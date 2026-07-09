import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatDate } from "../../dashboard-format";
import type { OrganSummary, SymptomEntry } from "../../dashboard-model";
import { t } from "../../i18n";
import { FileText } from "../health-icons";
import { organName, severityRank } from "./history-helpers";

export function SymptomTimeline({
  symptoms,
  organs,
  hasUnfiltered,
  onSelectOrgan,
  onClear,
}: {
  symptoms: SymptomEntry[];
  organs: OrganSummary[];
  hasUnfiltered: boolean;
  onSelectOrgan: (key: string) => void;
  onClear: () => void;
}) {
  if (symptoms.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyMedia variant="icon"><FileText /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{hasUnfiltered ? t("history.summary.noSymptomsMatch") : t("history.symptom.emptyTitle")}</EmptyTitle>
          <EmptyDescription>
            {hasUnfiltered ? t("history.empty.clearResults") : t("history.summary.logSymptom")}
          </EmptyDescription>
          {hasUnfiltered ? (
            <Button variant="outline" size="sm" className="mt-1" onClick={onClear}>{t("common.clearFilter")}</Button>
          ) : null}
        </EmptyHeader>
      </Empty>
    );
  }

  const sorted = [...symptoms].sort((a, b) => b.observedAt.localeCompare(a.observedAt) || severityRank(b) - severityRank(a));

  return (
    <div className="grid gap-3" aria-label={t("history.symptom.timelineLabel")}>
      {sorted.map((symptom) => {
        return (
          <article
            key={symptom.id}
            className="grid gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] sm:grid-cols-[5.5rem_minmax(0,1fr)]"
          >
            <time className="text-sm font-medium text-muted-foreground tnum" dateTime={symptom.observedAt}>{formatDate(symptom.observedAt)}</time>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{symptom.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{symptom.notes || t("history.symptom.noNotes")}</p>
                </div>
                <SeverityMeter severity={symptom.severity} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="h-5 px-2 text-xs text-muted-foreground" onClick={() => onSelectOrgan(symptom.organKey)} title={t("history.card.filterTo", { organ: organName(symptom.organKey, organs) })}>
                  {organName(symptom.organKey, organs)}
                </Button>
                <span className="text-xs text-muted-foreground tnum">{t("history.symptom.severity", { severity: symptom.severity })}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SeverityMeter({ severity }: { severity: number }) {
  const status = severityStatus(severity);
  return (
    <div className="flex items-center gap-2">
      <span className={`severity-meter status-${status}`} role="img" aria-label={t("history.symptom.severityLabel", { severity })}>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={`meter-dot ${index < severity ? `fill status-${status}` : ""}`} />
        ))}
      </span>
      <span className="text-xs text-muted-foreground tnum">{severity}/5</span>
    </div>
  );
}

function severityStatus(severity: number) {
  return severity >= 4 ? "attention" : severity >= 2 ? "monitor" : "normal";
}
