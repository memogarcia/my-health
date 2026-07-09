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
            {controller.organConditions.slice(0, 4).map((condition) => <ConditionRow condition={condition} key={condition.id} />)}
          </div>
        ) : <EmptyMessage>{t("conditions.empty")}</EmptyMessage>}
      </CardContent>
    </Card>
  );
}

function ConditionForm({ controller }: { controller: DashboardController }) {
  return (
    <form className="grid gap-2" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      void controller.addCondition({
        name: String(data.get("name") || ""),
        status: String(data.get("status") || "current") as ConditionStatus,
        diagnosedAt: String(data.get("diagnosedAt") || ""),
        notes: String(data.get("notes") || ""),
      }).then((saved) => { if (saved) form.reset(); });
    }}>
      <div className="grid gap-2">
        <Field>
          <FieldLabel className="sr-only" htmlFor="condition-name">{t("conditions.condition")}</FieldLabel>
          <Input id="condition-name" name="name" placeholder={t("conditions.placeholder.name")} required />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Select name="status" defaultValue="current">
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="current">{t("conditions.current")}</SelectItem>
                <SelectItem value="managed">{t("conditions.managed")}</SelectItem>
                <SelectItem value="past">{t("conditions.past")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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

function ConditionRow({ condition }: { condition: ConditionEntry }) {
  return (
    <div className="grid gap-1 rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <strong className="min-w-0 truncate">{condition.name}</strong>
        <StatusBadge status={condition.status === "current" ? "monitor" : "normal"}>{conditionLabels[condition.status]}</StatusBadge>
      </div>
      {condition.diagnosedAt ? <small className="text-muted-foreground">{formatDate(condition.diagnosedAt)}</small> : null}
      {condition.notes ? <p className="text-xs text-muted-foreground">{condition.notes}</p> : null}
    </div>
  );
}
