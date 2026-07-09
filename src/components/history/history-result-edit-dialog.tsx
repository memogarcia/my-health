import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { HealthStatus, LabResult } from "../../dashboard-model";
import { t } from "../../i18n";
import type { DashboardController } from "../../use-dashboard-controller";
import { OrganSelect } from "../organ-select";

export function EditLabDialog({ controller, lab, onClose }: { controller: DashboardController; lab: LabResult | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(lab)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("history.result.editTitle")}</DialogTitle>
          <DialogDescription>{t("history.result.editDescription")}</DialogDescription>
        </DialogHeader>
        {lab ? <EditLabForm controller={controller} lab={lab} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditLabForm({ controller, lab, onClose }: { controller: DashboardController; lab: LabResult; onClose: () => void }) {
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void controller.updateLabResult({
        id: lab.id,
        organKey: String(data.get("organKey") || lab.organKey),
        marker: String(data.get("marker") || ""),
        value: String(data.get("value") || ""),
        unit: String(data.get("unit") || ""),
        referenceRange: String(data.get("referenceRange") || ""),
        status: String(data.get("status") || "normal") as HealthStatus,
        measuredAt: String(data.get("measuredAt") || ""),
        notes: String(data.get("notes") || ""),
      }).then((saved) => { if (saved) onClose(); });
    }}>
      <FieldGroup>
        <OrganSelect organs={controller.display.organs} defaultValue={lab.organKey} />
        <Field><FieldLabel htmlFor="lab-edit-marker">{t("intake.result.marker")}</FieldLabel><Input id="lab-edit-marker" name="marker" defaultValue={lab.marker} required /></Field>
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <Field><FieldLabel htmlFor="lab-edit-value">{t("common.value")}</FieldLabel><Input id="lab-edit-value" name="value" defaultValue={lab.value} required /></Field>
          <Field><FieldLabel htmlFor="lab-edit-unit">{t("intake.result.unit")}</FieldLabel><Input id="lab-edit-unit" name="unit" defaultValue={lab.unit} /></Field>
          <Field><FieldLabel htmlFor="lab-edit-range">{t("intake.result.referenceRange")}</FieldLabel><Input id="lab-edit-range" name="referenceRange" defaultValue={lab.referenceRange} /></Field>
        </FieldGroup>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("common.status")}</FieldLabel>
            <Select name="status" defaultValue={lab.status}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="normal">{t("status.normal")}</SelectItem>
                <SelectItem value="monitor">{t("status.monitor")}</SelectItem>
                <SelectItem value="attention">{t("status.attention")}</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel htmlFor="lab-edit-date">{t("common.date")}</FieldLabel><Input id="lab-edit-date" name="measuredAt" type="date" defaultValue={lab.measuredAt} required /></Field>
        </FieldGroup>
        <Field><FieldLabel htmlFor="lab-edit-notes">{t("common.notes")}</FieldLabel><Textarea id="lab-edit-notes" name="notes" defaultValue={lab.notes} /></Field>
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></DialogFooter>
      </FieldGroup>
    </form>
  );
}
