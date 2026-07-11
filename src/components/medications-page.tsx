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
    <div className="grid items-start gap-8 max-w-6xl mx-auto py-8 px-4 xl:grid-cols-[380px_minmax(0,1fr)] animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <AddRegimenForm controller={controller} />
      <section className="grid gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 ease-out fill-mode-both" aria-label={t("medications.listLabel")}>
        <RegimenSummary activeCount={active.length} stoppedCount={stopped.length} />
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-surface/30 p-4 shadow-sm backdrop-blur-md">
          <RegimenTimeline items={items} />
        </div>
        {items.length === 0 ? (
          <Empty className="min-h-48 rounded-2xl border border-dashed border-border/50 bg-surface/20 backdrop-blur-sm transition-all hover:bg-surface/40">
            <EmptyMedia variant="icon"><Pill className="text-muted-ink drop-shadow-md" /></EmptyMedia>
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
  return (
    <Card className="xl:sticky xl:top-6 overflow-hidden border border-border/60 bg-surface/60 shadow-lg backdrop-blur-xl rounded-3xl transition-all duration-300 hover:shadow-xl hover:bg-surface/80">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-ink">{t("medications.addTitle")}</CardTitle>
            <CardDescription className="text-sm mt-1 text-muted-ink">{draft ? t("medications.draftDescription") : t("medications.defaultDescription")}</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-secondary/50 text-xs font-medium text-ink shadow-sm backdrop-blur-md">{t("medications.localOnly")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form key={controller.regimenDraft?.id || "blank"} onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          void controller.addRegimenItem(regimenInputFromForm(new FormData(formElement))).then((saved) => {
            if (saved) formElement.reset();
          });
        }}>
          <FieldGroup className="gap-5">
            {draft ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary shadow-inner">
                {t("medications.draftReady")}
              </div>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-kind">{t("medications.kind")}</FieldLabel>
                <Select name="kind" defaultValue={draft?.kind || "supplement"}>
                  <SelectTrigger aria-describedby="regimen-kind-description" className="w-full rounded-xl bg-canvas/50 transition-colors hover:bg-canvas/80 focus:ring-2 focus:ring-primary/20" id="regimen-kind"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 bg-surface/90 backdrop-blur-xl">
                    <SelectGroup>
                      <SelectItem value="medication" className="rounded-lg cursor-pointer">{t("medications.kind.medication")}</SelectItem>
                      <SelectItem value="supplement" className="rounded-lg cursor-pointer">{t("medications.kind.supplement")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription className="text-[11px]" id="regimen-kind-description">{t("medications.kindDescription")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-name">{t("medications.name")}</FieldLabel>
                <Input className="rounded-xl bg-canvas/50 transition-all hover:bg-canvas/80 focus:bg-canvas focus:ring-2 focus:ring-primary/20" id="regimen-name" name="name" placeholder={t("medications.placeholder.name")} defaultValue={draft?.name || ""} required />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-dose">{t("medications.dose")}</FieldLabel>
                <Input className="rounded-xl bg-canvas/50 transition-all hover:bg-canvas/80 focus:bg-canvas focus:ring-2 focus:ring-primary/20" id="regimen-dose" name="dose" placeholder={t("medications.placeholder.dose")} defaultValue={draft?.dose || ""} />
              </Field>
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-unit">{t("medications.unit")}</FieldLabel>
                <Input className="rounded-xl bg-canvas/50 transition-all hover:bg-canvas/80 focus:bg-canvas focus:ring-2 focus:ring-primary/20" id="regimen-unit" name="unit" placeholder={t("medications.placeholder.unit")} defaultValue={draft?.unit || ""} />
              </Field>
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-frequency">{t("medications.frequency")}</FieldLabel>
                <Input className="rounded-xl bg-canvas/50 transition-all hover:bg-canvas/80 focus:bg-canvas focus:ring-2 focus:ring-primary/20" id="regimen-frequency" name="frequency" placeholder={t("medications.placeholder.frequency")} defaultValue={draft?.frequency || ""} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-start">{t("medications.startDate")}</FieldLabel>
                <DatePicker id="regimen-start" name="startDate" defaultValue={draft?.startDate || ""} clearable className="rounded-xl" />
              </Field>
              <Field>
                <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-stop">{t("medications.stopDate")}</FieldLabel>
                <DatePicker ariaDescribedBy="regimen-stop-description" id="regimen-stop" name="stopDate" defaultValue={draft?.stopDate || ""} clearable className="rounded-xl" />
                <FieldDescription className="text-[11px]" id="regimen-stop-description">{t("medications.stopDescription")}</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-reason">{t("medications.reason")}</FieldLabel>
              <Input className="rounded-xl bg-canvas/50 transition-all hover:bg-canvas/80 focus:bg-canvas focus:ring-2 focus:ring-primary/20" id="regimen-reason" name="reason" placeholder={t("medications.placeholder.reason")} defaultValue={draft?.reason || ""} />
            </Field>
            <Field>
              <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-ink" htmlFor="regimen-notes">{t("common.notes")}</FieldLabel>
              <Textarea className="min-h-[80px] rounded-xl bg-canvas/50 transition-all hover:bg-canvas/80 focus:bg-canvas focus:ring-2 focus:ring-primary/20" id="regimen-notes" name="notes" placeholder={t("medications.placeholder.notes")} defaultValue={draft?.notes || ""} />
            </Field>
            <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-5">
              <p className="max-w-[200px] text-xs text-muted-ink/80 leading-relaxed">{t("medications.savedLocal")}</p>
              <div className="flex w-full sm:w-auto gap-3">
                {draft ? <Button type="button" variant="ghost" className="rounded-xl hover:bg-secondary/60 transition-colors" onClick={controller.clearRegimenDraft}>{t("common.clear")}</Button> : null}
                <Button type="submit" className="w-full sm:w-auto rounded-xl shadow-md transition-transform active:scale-95"><Plus className="mr-1.5 size-4" /> {t("medications.saveItem")}</Button>
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
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-surface/80 to-surface/40 px-5 py-4 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-border/80">
        <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10"></div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-ink">{t("medications.active")}</p>
        <strong className="mt-1 block text-3xl font-semibold tracking-tight text-ink tnum drop-shadow-sm">{formatCount(activeCount)}</strong>
      </div>
      <div className="group relative overflow-hidden rounded-2xl border border-border/30 bg-surface/20 px-5 py-4 shadow-sm backdrop-blur-md transition-all hover:bg-surface/30 hover:border-border/50">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-ink">{t("medications.stopped")}</p>
        <strong className="mt-1 block text-3xl font-semibold tracking-tight text-muted-ink tnum">{formatCount(stoppedCount)}</strong>
      </div>
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
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:bg-surface/70 hover:border-border/80", 
      muted && "bg-surface/20 border-border/20 opacity-80 hover:opacity-100 grayscale-[0.2]"
    )}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className={cn("mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl shadow-inner transition-colors", item.kind === "medication" ? "bg-primary/10 text-primary" : "bg-secondary text-ink")}>
            <Pill className="size-5" />
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-base font-medium tracking-tight text-ink drop-shadow-sm">{item.name}</strong>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Badge variant={item.kind === "medication" ? "default" : "secondary"} className="rounded-md font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur-sm">
                {item.kind === "medication" ? t("medications.kind.medication") : t("medications.kind.supplement")}
              </Badge>
              <Badge variant={item.active ? "outline" : "secondary"} className="rounded-md font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider bg-canvas/40 backdrop-blur-sm">
                {item.active ? t("medications.active") : t("medications.stopped")}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {facts.length ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div className="rounded-xl border border-border/30 bg-canvas/30 px-3 py-2 backdrop-blur-sm transition-colors group-hover:bg-canvas/50" key={label}>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-ink/80">{label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-ink tnum drop-shadow-sm">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      
      {item.reason ? (
        <p className="mt-4 text-sm text-muted-ink">
          <span className="font-semibold text-ink drop-shadow-sm">{t("medications.reasonLabel")}</span> {item.reason}
        </p>
      ) : null}
      
      {item.notes ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-ink/90 italic border-l-2 border-primary/20 pl-3">{item.notes}</p>
      ) : null}
      
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/30 pt-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:opacity-100">
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
