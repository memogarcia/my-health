import { useEffect, useRef } from "react";
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
  const idPrefix = `regimen-edit-${item.id}`;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  return (
    <form className="grid gap-5 rounded-2xl border border-primary/30 bg-surface/80 px-5 py-5 shadow-lg backdrop-blur-2xl ring-4 ring-primary/5 animate-in zoom-in-95 duration-200" onSubmit={(event) => {
      event.preventDefault();
      void controller.updateRegimenItem({ id: item.id, ...regimenInputFromForm(new FormData(event.currentTarget)) }).then((saved) => { if (saved) onCancel(); });
    }}>
      <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
        <Field>
          <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-kind`}>{t("medications.kind")}</FieldLabel>
          <Select name="kind" defaultValue={item.kind}>
            <SelectTrigger className="w-full rounded-xl" id={`${idPrefix}-kind`} ref={firstFieldRef}><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl border-border/50 bg-surface/90 backdrop-blur-xl">
              <SelectGroup>
                <SelectItem value="medication" className="rounded-lg">{t("medications.kind.medication")}</SelectItem>
                <SelectItem value="supplement" className="rounded-lg">{t("medications.kind.supplement")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-name`}>{t("medications.name")}</FieldLabel>
          <Input className="rounded-xl" id={`${idPrefix}-name`} name="name" defaultValue={item.name} required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-dose`}>{t("medications.dose")}</FieldLabel><Input className="rounded-xl" id={`${idPrefix}-dose`} name="dose" defaultValue={item.dose} /></Field>
        <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-unit`}>{t("medications.unit")}</FieldLabel><Input className="rounded-xl" id={`${idPrefix}-unit`} name="unit" defaultValue={item.unit} /></Field>
        <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-frequency`}>{t("medications.frequency")}</FieldLabel><Input className="rounded-xl" id={`${idPrefix}-frequency`} name="frequency" defaultValue={item.frequency} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-start-date`}>{t("medications.startDate")}</FieldLabel><DatePicker id={`${idPrefix}-start-date`} name="startDate" defaultValue={item.startDate} clearable className="rounded-xl" /></Field>
        <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-stop-date`}>{t("medications.stopDate")}</FieldLabel><DatePicker id={`${idPrefix}-stop-date`} name="stopDate" defaultValue={item.stopDate} clearable className="rounded-xl" /></Field>
      </div>
      <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-reason`}>{t("medications.reason")}</FieldLabel><Input className="rounded-xl" id={`${idPrefix}-reason`} name="reason" defaultValue={item.reason} /></Field>
      <Field><FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor={`${idPrefix}-notes`}>{t("common.notes")}</FieldLabel><Textarea className="min-h-[80px] rounded-xl" id={`${idPrefix}-notes`} name="notes" defaultValue={item.notes} /></Field>
      <div className="mt-2 flex justify-end gap-3 pt-2">
        <Button type="button" size="sm" variant="ghost" className="rounded-xl hover:bg-secondary/60 transition-colors" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button type="submit" size="sm" className="rounded-xl shadow-md transition-transform active:scale-95">{t("common.save")}</Button>
      </div>
    </form>
  );
}
