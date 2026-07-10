import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "../dashboard-format";
import type { ConditionEntry, ConditionStatus } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Plus } from "./health-icons";
import { OrganSelect } from "./organ-select";
import { EmptyMessage, StatusBadge } from "./health-status";

const conditionLabels: Record<ConditionStatus, string> = {
  current: t("conditions.current"),
  managed: t("conditions.managed"),
  past: t("conditions.past"),
};

export function ConditionsCard({ controller }: { controller: DashboardController }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("conditions.title")}</CardTitle>
        <CardAction><span className="text-xs text-muted-foreground">{controller.organConditions.length}</span></CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ConditionForm controller={controller} />
        {controller.organConditions.length ? (
          <div className="grid gap-2">
            {controller.organConditions.map((condition) => <ConditionRow condition={condition} controller={controller} key={condition.id} />)}
          </div>
        ) : <EmptyMessage>{t("conditions.empty")}</EmptyMessage>}
      </CardContent>
    </Card>
  );
}

function ConditionForm({ controller }: { controller: DashboardController }) {
  const [organKey, setOrganKey] = useState(controller.selectedOrganKey);

  useEffect(() => {
    setOrganKey(controller.selectedOrganKey);
  }, [controller.selectedOrganKey]);

  return (
    <form className="grid gap-2" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      void controller.addCondition({
        organKey: String(data.get("organKey") || controller.selectedOrganKey),
        name: String(data.get("name") || ""),
        status: String(data.get("status") || "current") as ConditionStatus,
        diagnosedAt: String(data.get("diagnosedAt") || ""),
        notes: String(data.get("notes") || ""),
      }).then((saved) => {
        if (!saved) return;
        form.reset();
        setOrganKey(controller.selectedOrganKey);
      });
    }}>
      <div className="grid gap-2">
        <OrganSelect id="condition-organ" organs={controller.display.organs} value={organKey} onChange={setOrganKey} description={t("intake.organDescription")} />
        <Field>
          <FieldLabel className="sr-only" htmlFor="condition-name">{t("conditions.condition")}</FieldLabel>
          <Input id="condition-name" name="name" placeholder={t("conditions.placeholder.name")} required />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Field>
            <FieldLabel className="sr-only" htmlFor="condition-status">{t("common.status")}</FieldLabel>
            <Select name="status" defaultValue="current">
              <SelectTrigger id="condition-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="current">{t("conditions.current")}</SelectItem>
                  <SelectItem value="managed">{t("conditions.managed")}</SelectItem>
                  <SelectItem value="past">{t("conditions.past")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" size="sm"><Plus data-icon="inline-start" />{t("common.save")}</Button>
        </div>
      </div>
      <details className="group rounded-md border border-border bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t("conditions.optionalDetails")}</summary>
        <div className="mt-2 grid gap-2">
          <Field>
            <FieldLabel htmlFor="condition-date">{t("common.date")}</FieldLabel>
            <Input id="condition-date" name="diagnosedAt" type="date" />
          </Field>
          <Field>
            <FieldLabel htmlFor="condition-notes">{t("common.notes")}</FieldLabel>
            <Textarea id="condition-notes" name="notes" placeholder={t("conditions.placeholder.notes")} />
          </Field>
        </div>
      </details>
    </form>
  );
}

function ConditionRow({ condition, controller }: { condition: ConditionEntry; controller: DashboardController }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <form className="grid gap-2 rounded-md border border-border px-3 py-2 text-sm" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        void controller.updateCondition({
          id: condition.id,
          organKey: String(data.get("organKey") || condition.organKey),
          name: String(data.get("name") || ""),
          status: String(data.get("status") || "current") as ConditionStatus,
          diagnosedAt: String(data.get("diagnosedAt") || ""),
          notes: String(data.get("notes") || ""),
        }).then((saved) => { if (saved) setEditing(false); });
      }}>
        <OrganSelect organs={controller.display.organs} defaultValue={condition.organKey} />
        <Field>
          <FieldLabel htmlFor={`condition-edit-name-${condition.id}`}>{t("conditions.condition")}</FieldLabel>
          <Input id={`condition-edit-name-${condition.id}`} name="name" defaultValue={condition.name} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`condition-edit-status-${condition.id}`}>{t("common.status")}</FieldLabel>
          <Select name="status" defaultValue={condition.status}>
            <SelectTrigger id={`condition-edit-status-${condition.id}`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="current">{t("conditions.current")}</SelectItem>
                <SelectItem value="managed">{t("conditions.managed")}</SelectItem>
                <SelectItem value="past">{t("conditions.past")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Input name="diagnosedAt" type="date" defaultValue={condition.diagnosedAt} aria-label={t("common.date")} />
        <Field>
          <FieldLabel htmlFor={`condition-edit-notes-${condition.id}`}>{t("common.notes")}</FieldLabel>
          <Textarea id={`condition-edit-notes-${condition.id}`} name="notes" defaultValue={condition.notes} placeholder={t("conditions.placeholder.notes")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
          <Button type="submit" size="sm">{t("common.save")}</Button>
        </div>
      </form>
    );
  }
  return (
    <div className="grid gap-1 rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <strong className="min-w-0 truncate">{condition.name}</strong>
        <StatusBadge status={condition.status === "current" ? "monitor" : "normal"}>{conditionLabels[condition.status]}</StatusBadge>
      </div>
      {condition.diagnosedAt ? <small className="text-muted-foreground">{formatDate(condition.diagnosedAt)}</small> : null}
      {condition.notes ? <p className="text-xs text-muted-foreground">{condition.notes}</p> : null}
      <div className="flex justify-end gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{t("common.edit")}</Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => { if (window.confirm(t("conditions.deleteConfirm"))) void controller.deleteCondition(condition.id); }}><Trash2 className="size-3.5" />{t("common.delete")}</Button>
      </div>
    </div>
  );
}
