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
import { Pill, Plus } from "./health-icons";

export function MedicationsPage({ controller }: { controller: DashboardController }) {
  const items = controller.display.regimenItems;
  const active = items.filter((item) => item.active);
  const stopped = items.filter((item) => !item.active);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
      <AddRegimenForm controller={controller} />
      <section className="grid gap-4" aria-label={t("medications.listLabel")}>
        <RegimenSummary activeCount={active.length} stoppedCount={stopped.length} />
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
            {active.length ? <RegimenList items={active} title={t("medications.activeRegimen")} /> : null}
            {stopped.length ? <RegimenList items={stopped} title={t("medications.stopped")} muted /> : null}
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
                <FieldLabel>{t("medications.kind")}</FieldLabel>
                <Select name="kind" defaultValue={draft?.kind || "supplement"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="medication">{t("medications.kind.medication")}</SelectItem>
                      <SelectItem value="supplement">{t("medications.kind.supplement")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{t("medications.kindDescription")}</FieldDescription>
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
                <Input id="regimen-start" name="startDate" type="date" defaultValue={draft?.startDate || ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-stop">{t("medications.stopDate")}</FieldLabel>
                <Input id="regimen-stop" name="stopDate" type="date" defaultValue={draft?.stopDate || ""} />
                <FieldDescription>{t("medications.stopDescription")}</FieldDescription>
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

function RegimenList({ items, title, muted }: { items: RegimenItem[]; title: string; muted?: boolean }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{t("medications.savedLocally", { count: formatCount(items.length) })}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => <RegimenItemRow item={item} key={item.id} muted={muted} />)}
      </CardContent>
    </Card>
  );
}

function RegimenItemRow({ item, muted }: { item: RegimenItem; muted?: boolean }) {
  const dose = [item.dose, item.unit].filter(Boolean).join(" ");
  const dateRange = formatDateRange(item);
  const facts: Array<[string, string]> = [];
  if (dose) facts.push([t("medications.fact.dose"), dose]);
  if (item.frequency) facts.push([t("medications.fact.when"), item.frequency]);
  if (dateRange) facts.push([t("medications.fact.dates"), dateRange]);
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
    </div>
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
