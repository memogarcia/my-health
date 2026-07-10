import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "../../dashboard-format";
import type { OrganSummary, SymptomEntry } from "../../dashboard-model";
import { t } from "../../i18n";
import type { DashboardController } from "../../use-dashboard-controller";
import { FileText } from "../health-icons";
import { OrganSelect } from "../organ-select";
import { organName, severityRank } from "./history-helpers";

export function SymptomTimeline({
  controller,
  symptoms,
  organs,
  hasUnfiltered,
  onSelectOrgan,
  onClear,
}: {
  controller: DashboardController;
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
      {sorted.map((symptom) => <SymptomRow controller={controller} symptom={symptom} organs={organs} onSelectOrgan={onSelectOrgan} key={symptom.id} />)}
    </div>
  );
}

function SymptomRow({ controller, symptom, organs, onSelectOrgan }: { controller: DashboardController; symptom: SymptomEntry; organs: OrganSummary[]; onSelectOrgan: (key: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <form className="grid gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-[0_1px_2px_rgb(15_23_42_/_0.04)]" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void controller.updateSymptom({
          id: symptom.id,
          organKey: String(data.get("organKey") || symptom.organKey),
          name: String(data.get("name") || ""),
          severity: Number(data.get("severity") || 1),
          observedAt: String(data.get("observedAt") || ""),
          notes: String(data.get("notes") || ""),
        }).then((saved) => { if (saved) setEditing(false); });
      }}>
        <FieldGroup className="grid gap-3 sm:grid-cols-2">
          <OrganSelect organs={controller.display.organs} defaultValue={symptom.organKey} includeOther />
          <Field>
            <FieldLabel htmlFor={`symptom-edit-name-${symptom.id}`}>{t("intake.symptom.name")}</FieldLabel>
            <Input id={`symptom-edit-name-${symptom.id}`} name="name" defaultValue={symptom.name} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`symptom-edit-severity-${symptom.id}`}>{t("intake.symptom.severity")}</FieldLabel>
            <Input id={`symptom-edit-severity-${symptom.id}`} name="severity" type="number" min={1} max={5} defaultValue={symptom.severity} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`symptom-edit-date-${symptom.id}`}>{t("common.date")}</FieldLabel>
            <Input id={`symptom-edit-date-${symptom.id}`} name="observedAt" type="date" defaultValue={symptom.observedAt} required />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel htmlFor={`symptom-edit-notes-${symptom.id}`}>{t("common.notes")}</FieldLabel>
          <Textarea id={`symptom-edit-notes-${symptom.id}`} name="notes" defaultValue={symptom.notes} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
          <Button type="submit" size="sm">{t("common.save")}</Button>
        </div>
      </form>
    );
  }
  return (
    <article className="grid gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] sm:grid-cols-[5.5rem_minmax(0,1fr)]">
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
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{t("common.edit")}</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => { if (window.confirm(t("history.symptom.deleteConfirm"))) void controller.deleteSymptom(symptom.id); }}><Trash2 className="size-3.5" />{t("common.delete")}</Button>
        </div>
      </div>
    </article>
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
