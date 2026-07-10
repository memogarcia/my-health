import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DialogFooter } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import type { ExtractedResult, ExtractedResultStatus, PendingDocument } from "../dashboard-model";
import { missingExtractedResultFields, type ExtractedResultField } from "../document-analysis";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AlertTriangle, FileText, LoaderCircle, Plus, Send } from "./health-icons";
import { StatusBadge, StatusDot } from "./health-status";
import { followUpPriorityLabel } from "./lab-result-context";
import { DatePicker } from "./ui/date-picker";
import { OrganSelect } from "./organ-select";

export function DocumentReview({ controller }: { controller: DashboardController }) {
  const document = controller.pendingDocument;
  const analysis = controller.documentAnalysis;

  if (!document && analysis.results.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("intake.document.emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("intake.document.emptyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4">
      {document ? <DocumentSummary document={document} /> : <PromptDraftSummary />}
      {analysis.status === "analyzing" ? (
        <div aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" />{t("intake.document.analyzing")}
        </div>
      ) : null}
      {analysis.status === "error" && analysis.error ? (
        <Alert>
          <AlertTriangle />
          <AlertDescription>{analysis.error}</AlertDescription>
        </Alert>
      ) : null}
      {analysis.status !== "analyzing" && analysis.results.length === 0 ? (
        <Alert>
          <AlertTriangle />
          <AlertDescription>{t("intake.document.noResults")}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3">
        {analysis.results.map((result, index) => (
          <ResultRowEditor key={result.id} controller={controller} result={result} resultNumber={index + 1} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="justify-self-start" onClick={() => controller.addDocumentResultRow()} disabled={analysis.status === "analyzing"}>
        <Plus data-icon="inline-start" />{t("intake.document.addResult")}
      </Button>
      <DialogFooter>
        <Button variant="ghost" onClick={() => controller.closeDialog()}>{t("common.cancel")}</Button>
        <Button onClick={() => void controller.acceptDocumentResults()} disabled={analysis.status === "analyzing" || analysis.results.length === 0}>
          <Send data-icon="inline-start" />{t("intake.document.accept")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ResultRowEditor({ controller, result, resultNumber }: { controller: DashboardController; result: ExtractedResult; resultNumber: number }) {
  const update = (patch: Partial<ExtractedResult>): void => controller.updateDocumentResult(result.id, patch);
  const missingFields = missingExtractedResultFields(result);
  const visualStatus = result.status || "empty";
  return (
    <div className="document-result-card grid gap-3 rounded-lg border bg-muted/30 p-3" data-result-needs-review={missingFields.length > 0 ? "true" : undefined} data-result-status={visualStatus}>
      {missingFields.length > 0 ? <Alert><AlertTriangle /><AlertDescription>{t("intake.document.resolveFields", { fields: missingFields.map(documentFieldLabel).join(", ") })}</AlertDescription></Alert> : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("intake.document.result")} {resultNumber}</span>
          <StatusBadge status={visualStatus}>
            <StatusDot status={visualStatus} className="size-1.5" />
            {result.status ? followUpPriorityLabel(result.status) : t("intake.document.needsReview")}
          </StatusBadge>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => controller.removeDocumentResult(result.id)} title={t("intake.document.removeResult")} aria-label={t("intake.document.removeResult")}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <OrganSelect organs={controller.display.organs} value={result.organKey} onChange={(value) => update({ organKey: value })} />
        <Field>
          <FieldLabel htmlFor={`marker-${result.id}`}>{t("intake.result.marker")}</FieldLabel>
          <Input id={`marker-${result.id}`} value={result.marker} onChange={(event) => update({ marker: event.target.value })} placeholder={t("intake.placeholder.marker")} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`value-${result.id}`}>{t("common.value")}</FieldLabel>
          <Input id={`value-${result.id}`} value={result.value} onChange={(event) => update({ value: event.target.value })} placeholder={t("intake.placeholder.value")} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`unit-${result.id}`}>{t("intake.result.unit")}</FieldLabel>
          <Input id={`unit-${result.id}`} value={result.unit} onChange={(event) => update({ unit: event.target.value })} placeholder={t("intake.placeholder.unit")} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`range-${result.id}`}>{t("intake.result.referenceRange")}</FieldLabel>
          <Input id={`range-${result.id}`} value={result.referenceRange} onChange={(event) => update({ referenceRange: event.target.value })} placeholder={t("intake.placeholder.range")} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`status-${result.id}`}>{t("lab.followUp.label")}</FieldLabel>
          <Select value={result.status || "needs-review"} onValueChange={(value) => update({ status: value === "needs-review" ? "" : value as ExtractedResultStatus })}>
            <SelectTrigger aria-describedby={`status-description-${result.id}`} className="w-full" id={`status-${result.id}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="needs-review">{t("intake.document.needsReview")}</SelectItem>
                <SelectItem value="normal">{followUpPriorityLabel("normal")}</SelectItem>
                <SelectItem value="monitor">{followUpPriorityLabel("monitor")}</SelectItem>
                <SelectItem value="attention">{followUpPriorityLabel("attention")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription id={`status-description-${result.id}`}>{t("lab.followUp.description")}</FieldDescription>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`date-${result.id}`}>{t("common.date")}</FieldLabel>
          <DatePicker id={`date-${result.id}`} value={result.measuredAt} onChange={(measuredAt) => update({ measuredAt })} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`notes-${result.id}`}>{t("common.notes")}</FieldLabel>
        <Textarea id={`notes-${result.id}`} value={result.notes} onChange={(event) => update({ notes: event.target.value })} placeholder={t("intake.placeholder.notes")} />
      </Field>
    </div>
  );
}

function documentFieldLabel(field: ExtractedResultField): string {
  if (field === "marker") return t("intake.result.marker");
  if (field === "value") return t("common.value");
  if (field === "measuredAt") return t("common.date");
  return t("lab.followUp.label");
}


function DocumentSummary({ document }: { document: PendingDocument }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
      <FileText />
      <div className="min-w-0">
        <strong className="block truncate">{document.sourceName}</strong>
        <small className="text-muted-foreground">{document.fileType} / {document.sizeLabel}</small>
      </div>
    </div>
  );
}

function PromptDraftSummary() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
      <FileText />
      <div className="min-w-0">
        <strong className="block truncate">{t("intake.document.promptDraft")}</strong>
        <small className="text-muted-foreground">{t("intake.document.reviewBeforeSaving")}</small>
      </div>
    </div>
  );
}
