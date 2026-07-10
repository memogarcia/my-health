import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayString } from "../dashboard-format";
import type { DialogKey, HealthStatus } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController, ResultInput, SymptomInput } from "../use-dashboard-controller";
import { Send } from "./health-icons";
import { DocumentReview } from "./document-review";
import { followUpPriorityLabel } from "./lab-result-context";
import { OrganSelect } from "./organ-select";
import { DatePicker } from "./ui/date-picker";

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
        {controller.activeDialog === "bodyNote" ? <BodyNoteForm controller={controller} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BodyNoteForm({ controller }: { controller: DashboardController }) {
  const draft = controller.bodyNoteDraft;
  if (!draft) return null;
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      void controller.addBodyNote(new FormData(event.currentTarget));
    }}>
      <FieldGroup>
        <Field>
          <FieldLabel>{t("body.notes.areaLabel")}</FieldLabel>
          <p className="text-sm text-muted-foreground">{draft.area}</p>
          <FieldDescription>{t("body.notes.areaDescription")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="body-note">{t("body.notes.note")}</FieldLabel>
          <Textarea autoFocus id="body-note" name="note" placeholder={t("body.notes.placeholder")} required />
        </Field>
        <DialogFooter><Button type="submit">{t("body.notes.save")}</Button></DialogFooter>
      </FieldGroup>
    </form>
  );
}

function ResultForm({ controller }: { controller: DashboardController }) {
  const [status, setStatus] = useState("" as HealthStatus | "");
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!status) return;
      const form = new FormData(event.currentTarget);
      const input: ResultInput = {
        organKey: String(form.get("organKey") || controller.selectedOrganKey),
        marker: String(form.get("marker") || ""),
        value: String(form.get("value") || ""),
        unit: String(form.get("unit") || ""),
        referenceRange: String(form.get("referenceRange") || ""),
        status: status as HealthStatus,
        measuredAt: String(form.get("measuredAt") || ""),
        notes: String(form.get("notes") || ""),
      };
      void controller.addLabResult(input, false);
    }}>
      <FieldGroup>
        <OrganSelect organs={controller.display.organs} defaultValue={controller.selectedOrganKey} description={t("intake.organDescription")} />
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
            <FieldLabel htmlFor="result-follow-up-priority">{t("lab.followUp.label")}</FieldLabel>
            <Select name="status" value={status} onValueChange={(value) => setStatus(value as HealthStatus)}>
              <SelectTrigger aria-describedby="result-follow-up-description" aria-required="true" className="w-full" id="result-follow-up-priority"><SelectValue placeholder={t("lab.followUp.choose")} /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="normal">{followUpPriorityLabel("normal")}</SelectItem>
                  <SelectItem value="monitor">{followUpPriorityLabel("monitor")}</SelectItem>
                  <SelectItem value="attention">{followUpPriorityLabel("attention")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription id="result-follow-up-description">{t("lab.followUp.description")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="measuredAt">{t("common.date")}</FieldLabel>
            <DatePicker id="measuredAt" name="measuredAt" defaultValue={todayString()} required />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel htmlFor="notes">{t("common.notes")}</FieldLabel>
          <Textarea id="notes" name="notes" placeholder={t("intake.placeholder.notes")} />
        </Field>
        <DialogFooter>
          <Button type="submit" disabled={!status}><Send data-icon="inline-start" />{t("intake.result.save")}</Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}


function SymptomForm({ controller }: { controller: DashboardController }) {
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const input: SymptomInput = {
        organKey: String(form.get("organKey") || controller.selectedOrganKey),
        name: String(form.get("name") || ""),
        severity: Number(form.get("severity") || 1),
        observedAt: String(form.get("observedAt") || ""),
        notes: String(form.get("notes") || ""),
      };
      void controller.addSymptom(input);
    }}>
      <FieldGroup>
        <OrganSelect organs={controller.display.organs} defaultValue={controller.selectedOrganKey} description={t("intake.organDescription")} includeOther />
        <Field><FieldLabel htmlFor="symptom-name">{t("intake.symptom.name")}</FieldLabel><Input id="symptom-name" name="name" placeholder={t("intake.symptom.placeholder")} required /></Field>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="severity">{t("intake.symptom.severity")}</FieldLabel><Input id="severity" name="severity" type="number" min={1} max={5} defaultValue={1} required /></Field>
          <Field><FieldLabel htmlFor="observedAt">{t("common.date")}</FieldLabel><DatePicker id="observedAt" name="observedAt" defaultValue={todayString()} required /></Field>
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
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="activity-date">{t("intake.activity.date")}</FieldLabel>
            <DatePicker id="activity-date" name="loggedAt" defaultValue={todayString()} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="activity-name">{t("intake.activity.name")}</FieldLabel>
            <Input id="activity-name" name="activityName" placeholder={t("intake.activity.namePlaceholder")} />
          </Field>
        </FieldGroup>
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="activity-duration">{t("intake.activity.duration")}</FieldLabel>
            <Input id="activity-duration" name="durationMinutes" type="number" min={0} step={1} />
          </Field>
          <Field>
            <FieldLabel htmlFor="activity-cigarettes">{t("intake.activity.cigarettes")}</FieldLabel>
            <Input id="activity-cigarettes" name="cigarettes" type="number" min={0} step={1} />
          </Field>
          <Field>
            <FieldLabel htmlFor="activity-drinks">{t("intake.activity.drinks")}</FieldLabel>
            <Input id="activity-drinks" name="drinks" type="number" min={0} step={1} />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel htmlFor="activity-notes">{t("common.notes")}</FieldLabel>
          <Textarea id="activity-notes" name="notes" placeholder={t("intake.activity.placeholder")} />
          <FieldDescription>{t("intake.activity.description")}</FieldDescription>
        </Field>
        <DialogFooter><Button type="submit">{t("intake.activity.save")}</Button></DialogFooter>
      </FieldGroup>
    </form>
  );
}


function dialogTitle(dialog: DialogKey): string {
  if (dialog === "activity") return t("intake.title.activity");
  if (dialog === "document") return t("intake.title.document");
  if (dialog === "symptom") return t("intake.title.symptom");
  if (dialog === "bodyNote") return t("body.notes.title");
  return t("intake.title.result");
}

function dialogDescription(dialog: DialogKey, organName: string): string {
  if (dialog === "activity") return t("intake.description.activity");
  if (dialog === "document") return t("intake.description.document");
  if (dialog === "symptom") return t("intake.description.symptom", { organ: organName });
  if (dialog === "bodyNote") return t("body.notes.description");
  return t("intake.description.result", { organ: organName });
}
