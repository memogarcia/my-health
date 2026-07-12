import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { t } from "../i18n";
import { regimenInputFromForm } from "../regimen-form";
import type { RegimenItem } from "../dashboard-model";
import type { DashboardController } from "../use-dashboard-controller";
import { DatePicker } from "./ui/date-picker";

export function RegimenEditForm({ controller, item, onCancel }: { controller: DashboardController; item: RegimenItem; onCancel: () => void }) {
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const idPrefix = `regimen-edit-${item.id}`;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  return (
    <form className="grid gap-5 rounded-xl bg-secondary/45 p-4" onSubmit={(event) => {
      event.preventDefault();
      if (saving) return;
      setSaving(true);
      void controller.updateRegimenItem({ id: item.id, ...regimenInputFromForm(new FormData(event.currentTarget)) })
        .then((saved) => { if (saved) onCancel(); })
        .finally(() => setSaving(false));
    }}>
      <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-kind`}>{t("medications.kind")}</FieldLabel>
          <Select name="kind" defaultValue={item.kind}>
            <SelectTrigger className="w-full" id={`${idPrefix}-kind`} ref={firstFieldRef}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="medication">{t("medications.kind.medication")}</SelectItem>
                <SelectItem value="supplement">{t("medications.kind.supplement")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-name`}>{t("medications.name")}</FieldLabel>
          <Input id={`${idPrefix}-name`} name="name" defaultValue={item.name} required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field><FieldLabel htmlFor={`${idPrefix}-dose`}>{t("medications.dose")}</FieldLabel><Input id={`${idPrefix}-dose`} name="dose" defaultValue={item.dose} /></Field>
        <Field><FieldLabel htmlFor={`${idPrefix}-unit`}>{t("medications.unit")}</FieldLabel><Input id={`${idPrefix}-unit`} name="unit" defaultValue={item.unit} /></Field>
        <Field><FieldLabel htmlFor={`${idPrefix}-frequency`}>{t("medications.frequency")}</FieldLabel><Input id={`${idPrefix}-frequency`} name="frequency" defaultValue={item.frequency} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field><FieldLabel htmlFor={`${idPrefix}-start-date`}>{t("medications.startDate")}</FieldLabel><DatePicker id={`${idPrefix}-start-date`} name="startDate" defaultValue={item.startDate} clearable /></Field>
        <Field><FieldLabel htmlFor={`${idPrefix}-stop-date`}>{t("medications.stopDate")}</FieldLabel><DatePicker id={`${idPrefix}-stop-date`} name="stopDate" defaultValue={item.stopDate} clearable /></Field>
      </div>
      <Field><FieldLabel htmlFor={`${idPrefix}-reason`}>{t("medications.reason")}</FieldLabel><Input id={`${idPrefix}-reason`} name="reason" defaultValue={item.reason} /></Field>
      <Field><FieldLabel htmlFor={`${idPrefix}-notes`}>{t("common.notes")}</FieldLabel><Textarea className="min-h-[80px]" id={`${idPrefix}-notes`} name="notes" defaultValue={item.notes} /></Field>
      <div className="flex justify-end gap-2 border-t border-border/45 pt-4">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button disabled={saving} type="submit" size="sm">{t("common.save")}</Button>
      </div>
    </form>
  );
}
