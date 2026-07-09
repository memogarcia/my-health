import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { todayString } from "../dashboard-format";
import type { DialogKey, ExtractedResult, HealthStatus, PendingDocument } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController, ResultInput, SymptomInput } from "../use-dashboard-controller";
import { AlertTriangle, FileText, LoaderCircle, Plus, Send } from "./health-icons";

export function IntakeDialog({ controller }: { controller: DashboardController }) {
  const title = dialogTitle(controller.activeDialog);
  return (
    <Dialog open={Boolean(controller.activeDialog)} onOpenChange={(open) => { if (!open) controller.closeDialog(); }}>
      <DialogContent className="max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{dialogDescription(controller.activeDialog, controller.selectedOrgan.name)}</DialogDescription>
        </DialogHeader>
        {controller.activeDialog === "lab" ? <ResultForm controller={controller} /> : null}
        {controller.activeDialog === "document" ? <DocumentReview controller={controller} /> : null}
        {controller.activeDialog === "symptom" ? <SymptomForm controller={controller} /> : null}
        {controller.activeDialog === "activity" ? <ActivityForm controller={controller} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ResultForm({ controller }: { controller: DashboardController }) {
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const input: ResultInput = {
        organKey: String(form.get("organKey") || controller.selectedOrganKey),
        marker: String(form.get("marker") || ""),
        value: String(form.get("value") || ""),
        unit: String(form.get("unit") || ""),
        referenceRange: String(form.get("referenceRange") || ""),
        status: String(form.get("status") || "normal") as HealthStatus,
        measuredAt: String(form.get("measuredAt") || ""),
        notes: String(form.get("notes") || ""),
      };
      void controller.addLabResult(input, false);
    }}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="marker">{t("intake.result.marker")}</FieldLabel>
          <Input id="marker" name="marker" placeholder={t("intake.placeholder.markerLong")} required />
        </Field>
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="value">{t("common.value")}</FieldLabel>
            <Input id="value" name="value" placeholder={t("intake.placeholder.value")} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="unit">{t("intake.result.unit")}</FieldLabel>
            <Input id="unit" name="unit" placeholder={t("intake.placeholder.unit")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="referenceRange">{t("intake.result.referenceRange")}</FieldLabel>
            <Input id="referenceRange" name="referenceRange" placeholder={t("intake.placeholder.range")} />
          </Field>
        </FieldGroup>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("common.status")}</FieldLabel>
            <Select name="status" defaultValue="normal">
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="normal">{t("status.normal")}</SelectItem>
                  <SelectItem value="monitor">{t("status.monitor")}</SelectItem>
                  <SelectItem value="attention">{t("status.attention")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="measuredAt">{t("common.date")}</FieldLabel>
            <Input id="measuredAt" name="measuredAt" type="date" defaultValue={todayString()} required />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel htmlFor="notes">{t("common.notes")}</FieldLabel>
          <Textarea id="notes" name="notes" placeholder={t("intake.placeholder.notes")} />
        </Field>
        <DialogFooter>
          <Button type="submit"><Send data-icon="inline-start" />{t("intake.result.save")}</Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}

function DocumentReview({ controller }: { controller: DashboardController }) {
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
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          {t("intake.document.analyzing")}
        </div>
      ) : null}
      {analysis.status === "error" && analysis.error ? (
        <Alert>
          <AlertTriangle />
          <AlertDescription>{analysis.error}</AlertDescription>
        </Alert>
      ) : null}
      {analysis.results.length === 0 ? (
        <Alert>
          <AlertTriangle />
          <AlertDescription>{t("intake.document.noResults")}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3">
        {analysis.results.map((result) => (
          <ResultRowEditor key={result.id} controller={controller} result={result} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="justify-self-start" onClick={() => controller.addDocumentResultRow()}>
        <Plus data-icon="inline-start" />{t("intake.document.addResult")}
      </Button>
      <DialogFooter>
        <Button variant="ghost" onClick={() => controller.closeDialog()}>{t("common.cancel")}</Button>
        <Button onClick={() => void controller.acceptDocumentResults()} disabled={analysis.status === "analyzing"}>
          <Send data-icon="inline-start" />{t("intake.document.accept")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ResultRowEditor({ controller, result }: { controller: DashboardController; result: ExtractedResult }) {
  const update = (patch: Partial<ExtractedResult>): void => controller.updateDocumentResult(result.id, patch);
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("intake.document.result")}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => controller.removeDocumentResult(result.id)} title={t("intake.document.removeResult")} aria-label={t("intake.document.removeResult")}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("intake.result.organSystem")}</FieldLabel>
          <Select value={result.organKey} onValueChange={(value) => update({ organKey: value })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>{controller.display.organs.map((organ) => <SelectItem value={organ.key} key={organ.key}>{organ.name}</SelectItem>)}</SelectGroup>
            </SelectContent>
          </Select>
        </Field>
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
          <FieldLabel>{t("common.status")}</FieldLabel>
          <Select value={result.status} onValueChange={(value) => update({ status: value as HealthStatus })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="normal">{t("status.normal")}</SelectItem>
                <SelectItem value="monitor">{t("status.monitor")}</SelectItem>
                <SelectItem value="attention">{t("status.attention")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`date-${result.id}`}>{t("common.date")}</FieldLabel>
          <Input id={`date-${result.id}`} type="date" value={result.measuredAt} onChange={(event) => update({ measuredAt: event.target.value })} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`notes-${result.id}`}>{t("common.notes")}</FieldLabel>
        <Textarea id={`notes-${result.id}`} value={result.notes} onChange={(event) => update({ notes: event.target.value })} placeholder={t("intake.placeholder.notes")} />
      </Field>
    </div>
  );
}

function SymptomForm({ controller }: { controller: DashboardController }) {
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const input: SymptomInput = {
        name: String(form.get("name") || ""),
        severity: Number(form.get("severity") || 1),
        observedAt: String(form.get("observedAt") || ""),
        notes: String(form.get("notes") || ""),
      };
      void controller.addSymptom(input);
    }}>
      <FieldGroup>
        <Field><FieldLabel htmlFor="symptom-name">{t("intake.symptom.name")}</FieldLabel><Input id="symptom-name" name="name" placeholder={t("intake.symptom.placeholder")} required /></Field>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="severity">{t("intake.symptom.severity")}</FieldLabel><Input id="severity" name="severity" type="number" min={1} max={5} defaultValue={1} required /></Field>
          <Field><FieldLabel htmlFor="observedAt">{t("common.date")}</FieldLabel><Input id="observedAt" name="observedAt" type="date" defaultValue={todayString()} required /></Field>
        </FieldGroup>
        <Field><FieldLabel htmlFor="symptom-notes">{t("common.notes")}</FieldLabel><Textarea id="symptom-notes" name="notes" placeholder={t("intake.symptom.notesPlaceholder")} /></Field>
        <DialogFooter><Button type="submit">{t("intake.symptom.save")}</Button></DialogFooter>
      </FieldGroup>
    </form>
  );
}

function ActivityForm({ controller }: { controller: DashboardController }) {
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      void controller.addActivity(new FormData(event.currentTarget));
    }}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="activity-prompt">{t("intake.activity.prompt")}</FieldLabel>
          <Textarea id="activity-prompt" name="prompt" placeholder={t("intake.activity.placeholder")} required />
          <FieldDescription>{t("intake.activity.description")}</FieldDescription>
        </Field>
        <DialogFooter><Button type="submit">{t("intake.activity.save")}</Button></DialogFooter>
      </FieldGroup>
    </form>
  );
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

function dialogTitle(dialog: DialogKey): string {
  if (dialog === "activity") return t("intake.title.activity");
  if (dialog === "document") return t("intake.title.document");
  if (dialog === "symptom") return t("intake.title.symptom");
  return t("intake.title.result");
}

function dialogDescription(dialog: DialogKey, organName: string): string {
  if (dialog === "activity") return t("intake.description.activity");
  if (dialog === "document") return t("intake.description.document");
  if (dialog === "symptom") return t("intake.description.symptom", { organ: organName });
  return t("intake.description.result", { organ: organName });
}
