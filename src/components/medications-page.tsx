import { useState } from "react";
import { Pencil, RotateCcw, Square, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RegimenEditForm } from "./regimen-edit-form";
import { DatePicker } from "./ui/date-picker";

export function MedicationsPage({ controller }: { controller: DashboardController }) {
  const items = controller.display.regimenItems;
  const active = items.filter((item) => item.active);
  const stopped = items.filter((item) => !item.active);

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-7 px-8 py-7 xl:grid-cols-[360px_minmax(0,1fr)] max-[880px]:px-5">
      <header className="border-b border-border/55 pb-5 xl:col-span-2">
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">{t("nav.medications.label")}</h1>
        <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted-ink">{t("nav.medications.description")}</p>
      </header>
      <AddRegimenForm controller={controller} />
      <section className="grid gap-5" aria-label={t("medications.listLabel")}>
        <RegimenSummary activeCount={active.length} stoppedCount={stopped.length} />
        <div className="overflow-hidden rounded-xl bg-surface p-4">
          <RegimenTimeline items={items} />
        </div>
        {items.length === 0 ? (
          <Empty className="min-h-48 bg-transparent">
            <EmptyMedia variant="icon"><Pill className="text-muted-ink" /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-ink font-medium tracking-tight">{t("medications.emptyTitle")}</EmptyTitle>
              <EmptyDescription className="text-muted-ink">{t("medications.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-6">
            {active.length ? <RegimenList controller={controller} items={active} title={t("medications.activeRegimen")} /> : null}
            {stopped.length ? <RegimenList controller={controller} items={stopped} title={t("medications.stopped")} muted /> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function AddRegimenForm({ controller }: { controller: DashboardController }) {
  const draft = controller.regimenDraft?.input;
  const [saving, setSaving] = useState(false);
  return (
    <Card className="overflow-hidden xl:sticky xl:top-0">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("medications.addTitle")}</CardTitle>
            <CardDescription className="text-sm mt-1 text-muted-ink">{draft ? t("medications.draftDescription") : t("medications.defaultDescription")}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-medium">{t("medications.localOnly")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form key={controller.regimenDraft?.id || "blank"} onSubmit={(event) => {
          event.preventDefault();
          if (saving) return;
          const formElement = event.currentTarget;
          setSaving(true);
          void controller.addRegimenItem(regimenInputFromForm(new FormData(formElement)))
            .then((saved) => {
              if (saved) formElement.reset();
            })
            .finally(() => setSaving(false));
        }}>
          <FieldGroup className="gap-5">
            {draft ? (
              <div className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-ink">
                {t("medications.draftReady")}
              </div>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
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
                <FieldDescription className="text-[11px]" id="regimen-kind-description">{t("medications.kindDescription")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-name">{t("medications.name")}</FieldLabel>
                <Input id="regimen-name" name="name" placeholder={t("medications.placeholder.name")} defaultValue={draft?.name || ""} required />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
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
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="regimen-start">{t("medications.startDate")}</FieldLabel>
                <DatePicker id="regimen-start" name="startDate" defaultValue={draft?.startDate || ""} clearable />
              </Field>
              <Field>
                <FieldLabel htmlFor="regimen-stop">{t("medications.stopDate")}</FieldLabel>
                <DatePicker ariaDescribedBy="regimen-stop-description" id="regimen-stop" name="stopDate" defaultValue={draft?.stopDate || ""} clearable />
                <FieldDescription className="text-[11px]" id="regimen-stop-description">{t("medications.stopDescription")}</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="regimen-reason">{t("medications.reason")}</FieldLabel>
              <Input id="regimen-reason" name="reason" placeholder={t("medications.placeholder.reason")} defaultValue={draft?.reason || ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="regimen-notes">{t("common.notes")}</FieldLabel>
              <Textarea className="min-h-[80px]" id="regimen-notes" name="notes" placeholder={t("medications.placeholder.notes")} defaultValue={draft?.notes || ""} />
            </Field>
            <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-5">
              <p className="max-w-[200px] text-xs text-muted-ink/80 leading-relaxed">{t("medications.savedLocal")}</p>
              <div className="flex w-full sm:w-auto gap-3">
                {draft ? <Button type="button" variant="ghost" onClick={controller.clearRegimenDraft}>{t("common.clear")}</Button> : null}
                <Button disabled={saving} type="submit" className="w-full sm:w-auto"><Plus className="mr-1.5 size-4" /> {t("medications.saveItem")}</Button>
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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border/55 py-3">
      <p className="text-xs text-muted-ink"><strong className="mr-1.5 text-sm tabular-nums text-ink">{activeCount}</strong>{t("medications.active")}</p>
      <p className="text-xs text-muted-ink"><strong className="mr-1.5 text-sm tabular-nums text-ink">{stoppedCount}</strong>{t("medications.stopped")}</p>
    </div>
  );
}

function RegimenList({ controller, items, title, muted }: { controller: DashboardController; items: RegimenItem[]; title: string; muted?: boolean }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className={cn("text-lg font-semibold tracking-tight", muted ? "text-muted-ink" : "text-ink")}>{title}</h3>
        <span className="text-xs text-quiet">{t("medications.savedLocally", { count: formatCount(items.length) })}</span>
      </div>
      <div className="grid gap-3">
        {items.map((item) => <RegimenItemRow controller={controller} item={item} key={item.id} muted={muted} />)}
      </div>
    </div>
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
    <div className={cn("group rounded-xl bg-surface p-4", muted && "bg-secondary/45 text-muted-ink")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg", item.kind === "medication" ? "bg-accent text-accent-ink" : "bg-secondary text-ink")}>
            <Pill className="size-5" />
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-ink">{item.name}</strong>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Badge variant={item.kind === "medication" ? "default" : "secondary"} className="rounded-md px-2 py-0.5 text-[10px] font-medium">
                {item.kind === "medication" ? t("medications.kind.medication") : t("medications.kind.supplement")}
              </Badge>
              <Badge variant={item.active ? "outline" : "secondary"} className="rounded-md px-2 py-0.5 text-[10px] font-medium">
                {item.active ? t("medications.active") : t("medications.stopped")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {facts.length ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div className="rounded-lg bg-secondary/60 px-3 py-2" key={label}>
              <dt className="text-[10px] font-medium text-muted-ink">{label}</dt>
              <dd className="mt-0.5 truncate text-xs font-semibold text-ink tnum">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {item.reason ? (
        <p className="mt-4 text-sm text-muted-ink">
          <span className="font-semibold text-ink">{t("medications.reasonLabel")}</span> {item.reason}
        </p>
      ) : null}

      {item.notes ? (
        <p className="mt-3 rounded-lg bg-secondary/55 px-3 py-2 text-sm leading-relaxed text-muted-ink">{item.notes}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-1 border-t border-border/45 pt-3">
        <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg px-3 hover:bg-secondary/60 text-xs font-medium" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 size-3.5" />{t("common.edit")}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg px-3 hover:bg-secondary/60 text-xs font-medium" onClick={() => void controller.setRegimenItemActive(item.id, !item.active)}>
          {item.active ? <Square className="mr-1.5 size-3.5" /> : <RotateCcw className="mr-1.5 size-3.5" />}
          {item.active ? t("medications.stop") : t("medications.reactivate")}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg px-3 text-destructive hover:bg-destructive/10 text-xs font-medium" onClick={() => { if (window.confirm(t("medications.deleteConfirm"))) void controller.deleteRegimenItem(item.id); }}>
          <Trash2 className="mr-1.5 size-3.5" />{t("common.delete")}
        </Button>
      </div>
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
