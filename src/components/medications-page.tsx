import { useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw, Square, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDate } from "../dashboard-format";
import type { RegimenItem } from "../dashboard-model";
import { t } from "../i18n";
import { regimenInputFromForm } from "../regimen-form";
import type { DashboardController } from "../use-dashboard-controller";
import { RegimenTimeline } from "./charts/regimen-timeline";
import { Pill, Plus } from "./health-icons";
import { DatePicker } from "./ui/date-picker";

export function MedicationsPage({ controller }: { controller: DashboardController }) {
  const items = controller.display.regimenItems;
  const active = items.filter((item) => item.active);
  const stopped = items.filter((item) => !item.active);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
      <AddRegimenForm controller={controller} />
      <section className="grid gap-4" aria-label={t("medications.listLabel")}>
        <RegimenSummary activeCount={active.length} stoppedCount={stopped.length} />
        <RegimenTimeline items={items} />
        {items.length === 0 ? (
          <Empty className="min-h-48 border border-dashed bg-muted/20">
            <EmptyMedia variant="icon"><Pill /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t("medications.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("medications.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {active.length ? <RegimenList controller={controller} items={active} title={t("medications.activeRegimen")} /> : null}
            {stopped.length ? <RegimenList controller={controller} items={stopped} title={t("medications.stopped")} muted /> : null}
          </>
        )}
      </section>
    </div>
  );
}

function AddRegimenForm({ controller }: { controller: DashboardController }) {
  const draft = controller.regimenDraft?.input;
  return (
    <Card className="xl:sticky xl:top-4">
      <CardHeader>
        <CardTitle>{t("medications.addTitle")}</CardTitle>
        <CardDescription>{draft ? t("medications.draftDescription") : t("medications.defaultDescription")}</CardDescription>
        <CardAction>
          <Badge variant="outline">{t("medications.localOnly")}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form key={controller.regimenDraft?.id || "blank"} onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          void controller.addRegimenItem(regimenInputFromForm(new FormData(formElement))).then((saved) => {
            if (saved) formElement.reset();
          });
        }}>
          <FieldGroup>
            {draft ? (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {t("medications.draftReady")}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
              <Field>
                <FieldLabel htmlFor="regimen-kind">{t("medications.kind")}</FieldLabel>
                <Select name="kind" defaultValue={draft?.kind || "supplement"}>
                  <SelectTrigger aria-describedby="regimen-kind-description" className="w-full" id="regimen-kind"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="medication">{t("medications.kind.medication")}</SelectItem>
                      <SelectItem value="supplement">{t("medications.kind.supplement")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription id="regimen-kind-description">{t("medications.kindDescription")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-name">{t("medications.name")}</FieldLabel>
                <Input id="regimen-name" name="name" placeholder={t("medications.placeholder.name")} defaultValue={draft?.name || ""} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="regimen-dose">{t("medications.dose")}</FieldLabel>
                <Input id="regimen-dose" name="dose" placeholder={t("medications.placeholder.dose")} defaultValue={draft?.dose || ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-unit">{t("medications.unit")}</FieldLabel>
                <Input id="regimen-unit" name="unit" placeholder={t("medications.placeholder.unit")} defaultValue={draft?.unit || ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-frequency">{t("medications.frequency")}</FieldLabel>
                <Input id="regimen-frequency" name="frequency" placeholder={t("medications.placeholder.frequency")} defaultValue={draft?.frequency || ""} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="regimen-start">{t("medications.startDate")}</FieldLabel>
                <DatePicker id="regimen-start" name="startDate" defaultValue={draft?.startDate || ""} clearable />
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-stop">{t("medications.stopDate")}</FieldLabel>
                <DatePicker ariaDescribedBy="regimen-stop-description" id="regimen-stop" name="stopDate" defaultValue={draft?.stopDate || ""} clearable />
                <FieldDescription id="regimen-stop-description">{t("medications.stopDescription")}</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="regimen-reason">{t("medications.reason")}</FieldLabel>
              <Input id="regimen-reason" name="reason" placeholder={t("medications.placeholder.reason")} defaultValue={draft?.reason || ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="regimen-notes">{t("common.notes")}</FieldLabel>
              <Textarea id="regimen-notes" name="notes" placeholder={t("medications.placeholder.notes")} defaultValue={draft?.notes || ""} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="max-w-sm text-xs text-muted-foreground">{t("medications.savedLocal")}</p>
              <div className="flex gap-2">
                {draft ? <Button type="button" variant="ghost" onClick={controller.clearRegimenDraft}>{t("common.clear")}</Button> : null}
                <Button type="submit"><Plus /> {t("medications.saveItem")}</Button>
              </div>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function RegimenSummary({ activeCount, stoppedCount }: { activeCount: number; stoppedCount: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{t("medications.active")}</p>
        <strong className="text-lg font-semibold tnum">{formatCount(activeCount)}</strong>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{t("medications.stopped")}</p>
        <strong className="text-lg font-semibold tnum">{formatCount(stoppedCount)}</strong>
      </div>
    </div>
  );
}

function RegimenList({ controller, items, title, muted }: { controller: DashboardController; items: RegimenItem[]; title: string; muted?: boolean }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{t("medications.savedLocally", { count: formatCount(items.length) })}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => <RegimenItemRow controller={controller} item={item} key={item.id} muted={muted} />)}
      </CardContent>
    </Card>
  );
}

function RegimenItemRow({ controller, item, muted }: { controller: DashboardController; item: RegimenItem; muted?: boolean }) {
  const [editing, setEditing] = useState(false);
  const dose = [item.dose, item.unit].filter(Boolean).join(" ");
  const dateRange = formatDateRange(item);
  const facts: Array<[string, string]> = [];
  if (dose) facts.push([t("medications.fact.dose"), dose]);
  if (item.frequency) facts.push([t("medications.fact.when"), item.frequency]);
  if (dateRange) facts.push([t("medications.fact.dates"), dateRange]);
  if (editing) {
    return <RegimenEditForm controller={controller} item={item} onCancel={() => setEditing(false)} />;
  }
  return (
    <div className={cn("grid gap-3 rounded-lg border border-border bg-card px-3 py-3", muted && "bg-muted/30 opacity-75")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Pill /></span>
          <div className="min-w-0">
            <strong className="block truncate text-sm">{item.name}</strong>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant={item.kind === "medication" ? "default" : "secondary"}>{item.kind === "medication" ? t("medications.kind.medication") : t("medications.kind.supplement")}</Badge>
              <Badge variant={item.active ? "outline" : "secondary"}>{item.active ? t("medications.active") : t("medications.stopped")}</Badge>
            </div>
          </div>
        </div>
      </div>
      {facts.length ? (
        <dl className="grid gap-2 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div className="rounded-md bg-muted/40 px-2.5 py-2" key={label}>
              <dt className="text-[0.68rem] font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 truncate text-sm tnum">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {item.reason ? <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{t("medications.reasonLabel")}</span> {item.reason}</p> : null}
      {item.notes ? <p className="text-xs leading-relaxed text-muted-foreground">{item.notes}</p> : null}
      <div className="flex flex-wrap justify-end gap-1 border-t border-border pt-2">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{t("common.edit")}</Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => void controller.setRegimenItemActive(item.id, !item.active)}>
          {item.active ? <Square className="size-3.5" /> : <RotateCcw className="size-3.5" />}{item.active ? t("medications.stop") : t("medications.reactivate")}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => { if (window.confirm(t("medications.deleteConfirm"))) void controller.deleteRegimenItem(item.id); }}><Trash2 className="size-3.5" />{t("common.delete")}</Button>
      </div>
    </div>
  );
}

function RegimenEditForm({ controller, item, onCancel }: { controller: DashboardController; item: RegimenItem; onCancel: () => void }) {
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const idPrefix = `regimen-edit-${item.id}`;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  return (
    <form className="grid gap-3 rounded-lg border border-border bg-card px-3 py-3" onSubmit={(event) => {
      event.preventDefault();
      void controller.updateRegimenItem({ id: item.id, ...regimenInputFromForm(new FormData(event.currentTarget)) }).then((saved) => { if (saved) onCancel(); });
    }}>
      <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Field><FieldLabel htmlFor={`${idPrefix}-dose`}>{t("medications.dose")}</FieldLabel><Input id={`${idPrefix}-dose`} name="dose" defaultValue={item.dose} /></Field>
        <Field><FieldLabel htmlFor={`${idPrefix}-unit`}>{t("medications.unit")}</FieldLabel><Input id={`${idPrefix}-unit`} name="unit" defaultValue={item.unit} /></Field>
        <Field><FieldLabel htmlFor={`${idPrefix}-frequency`}>{t("medications.frequency")}</FieldLabel><Input id={`${idPrefix}-frequency`} name="frequency" defaultValue={item.frequency} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field><FieldLabel htmlFor={`${idPrefix}-start-date`}>{t("medications.startDate")}</FieldLabel><DatePicker id={`${idPrefix}-start-date`} name="startDate" defaultValue={item.startDate} clearable /></Field>
        <Field><FieldLabel htmlFor={`${idPrefix}-stop-date`}>{t("medications.stopDate")}</FieldLabel><DatePicker id={`${idPrefix}-stop-date`} name="stopDate" defaultValue={item.stopDate} clearable /></Field>
      </div>
      <Field><FieldLabel htmlFor={`${idPrefix}-reason`}>{t("medications.reason")}</FieldLabel><Input id={`${idPrefix}-reason`} name="reason" defaultValue={item.reason} /></Field>
      <Field><FieldLabel htmlFor={`${idPrefix}-notes`}>{t("common.notes")}</FieldLabel><Textarea id={`${idPrefix}-notes`} name="notes" defaultValue={item.notes} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button type="submit" size="sm">{t("common.save")}</Button>
      </div>
    </form>
  );
}

function formatCount(count: number): string {
  return t(count === 1 ? "medications.item" : "medications.items", { count });
}

function formatDateRange(item: RegimenItem): string {
  if (item.startDate && item.stopDate) return t("medications.date.to", { start: formatDate(item.startDate), stop: formatDate(item.stopDate) });
  if (item.startDate) return t("medications.date.started", { date: formatDate(item.startDate) });
  if (item.stopDate) return t("medications.date.stopped", { date: formatDate(item.stopDate) });
  return "";
}
