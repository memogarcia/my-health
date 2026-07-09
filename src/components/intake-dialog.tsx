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
import { OrganSelect } from "./organ-select";

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
        <OrganSelect organs={controller.display.organs} defaultValue={controller.selectedOrganKey} description={t("intake.organDescription")} />
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
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="activity-date">{t("intake.activity.date")}</FieldLabel>
            <Input id="activity-date" name="loggedAt" type="date" defaultValue={todayString()} required />
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
  return t("intake.title.result");
}

function dialogDescription(dialog: DialogKey, organName: string): string {
  if (dialog === "activity") return t("intake.description.activity");
  if (dialog === "document") return t("intake.description.document");
  if (dialog === "symptom") return t("intake.description.symptom", { organ: organName });
  return t("intake.description.result", { organ: organName });
}
