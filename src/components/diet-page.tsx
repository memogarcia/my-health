import { useMemo, useRef, useState } from "react";
import { Pencil, Trash2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, todayString } from "@/dashboard-format";
import type { DietEntry, DietMeal } from "@/dashboard-model";
import { t } from "@/i18n";
import type { DashboardController } from "@/use-dashboard-controller";

const meals: DietMeal[] = ["breakfast", "lunch", "dinner", "snack"];

export function DietPage({ controller }: { controller: DashboardController }) {
  const [draft, setDraft] = useState<DietEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const entries = useMemo(
    () => [...controller.userState.dietEntries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt) || b.id.localeCompare(a.id)),
    [controller.userState.dietEntries],
  );
  const todayCount = entries.filter((entry) => entry.loggedAt === todayString()).length;

  return (
    <div className="mx-auto grid w-full max-w-[1080px] gap-6 px-8 py-7 max-[880px]:px-5">
      <header className="flex items-start justify-between gap-5 border-b border-border/55 pb-5">
        <div>
          <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">{t("diet.title")}</h1>
          <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted-ink">{t("diet.description")}</p>
        </div>
        <p className="shrink-0 text-xs font-medium tabular-nums text-muted-ink">{t(todayCount === 1 ? "diet.todayCount" : "diet.todayCountPlural", { count: todayCount })}</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
        <section className="lg:sticky lg:top-0" aria-label={draft ? t("diet.editTitle") : t("diet.addTitle")}>
          <h2 className="text-sm font-semibold text-ink">{draft ? t("diet.editTitle") : t("diet.addTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-ink">{t("diet.formDescription")}</p>
          <form className="mt-4" key={draft?.id || "new-diet-entry"} ref={formRef} onSubmit={(event) => {
            event.preventDefault();
            if (saving) return;
            const form = event.currentTarget;
            setSaving(true);
            void controller.saveDietEntry(new FormData(form), draft?.id)
              .then((saved) => {
                if (!saved) return;
                form.reset();
                setDraft(null);
              })
              .finally(() => setSaving(false));
          }}>
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="diet-date">{t("diet.date")}</FieldLabel>
                  <DatePicker defaultValue={draft?.loggedAt || todayString()} id="diet-date" name="loggedAt" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="diet-meal">{t("diet.meal")}</FieldLabel>
                  <Select defaultValue={draft?.meal || "breakfast"} name="meal">
                    <SelectTrigger className="w-full" id="diet-meal"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{meals.map((meal) => <SelectItem key={meal} value={meal}>{t(`diet.meal.${meal}`)}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="diet-title">{t("diet.food")}</FieldLabel>
                <Input defaultValue={draft?.title || ""} id="diet-title" maxLength={160} name="title" placeholder={t("diet.foodPlaceholder")} required />
                <FieldDescription>{t("diet.foodDescription")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="diet-notes">{t("common.notes")}</FieldLabel>
                <Textarea className="min-h-24 resize-y" defaultValue={draft?.notes || ""} id="diet-notes" name="notes" placeholder={t("diet.notesPlaceholder")} />
              </Field>
              <div className="flex justify-end gap-2 border-t border-border/55 pt-4">
                {draft ? <Button onClick={() => setDraft(null)} type="button" variant="ghost">{t("common.cancel")}</Button> : null}
                <Button disabled={saving} type="submit">{draft ? t("diet.update") : t("diet.save")}</Button>
              </div>
            </FieldGroup>
          </form>
        </section>

        <section aria-label={t("diet.history")}>
          <div className="flex items-baseline justify-between gap-3 border-b border-border/55 pb-3">
            <h2 className="text-sm font-semibold text-ink">{t("diet.history")}</h2>
            <span className="text-xs tabular-nums text-muted-ink">{t("diet.totalCount", { count: entries.length })}</span>
          </div>
          {entries.length ? (
            <div>
              {entries.map((entry) => (
                <article className="grid grid-cols-[34px_minmax(0,1fr)_auto] gap-3 border-b border-border/45 py-4" key={entry.id}>
                  <span className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-ink"><Utensils className="size-4" /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="text-sm font-semibold text-ink">{entry.title}</h3>
                      <span className="text-[11px] font-medium text-muted-ink">{t(`diet.meal.${entry.meal}`)} · {formatDate(entry.loggedAt)}</span>
                    </div>
                    {entry.notes ? <p className="mt-1.5 max-w-[68ch] whitespace-pre-wrap text-xs leading-relaxed text-muted-ink">{entry.notes}</p> : null}
                  </div>
                  <div className="flex gap-0.5">
                    <Button aria-label={t("diet.editEntry", { title: entry.title })} onClick={() => {
                      setDraft(entry);
                      requestAnimationFrame(() => {
                        formRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                        formRef.current?.querySelector<HTMLInputElement>("#diet-title")?.focus({ preventScroll: true });
                      });
                    }} size="icon-xs" type="button" variant="ghost"><Pencil /></Button>
                    <Button aria-label={t("diet.deleteEntry", { title: entry.title })} onClick={() => { if (window.confirm(t("diet.deleteConfirm"))) void controller.deleteDietEntry(entry.id); }} size="icon-xs" type="button" variant="destructive"><Trash2 /></Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center content-center text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-ink"><Utensils className="size-5" /></span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{t("diet.emptyTitle")}</h3>
              <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-muted-ink">{t("diet.emptyDescription")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
