import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "../dashboard-format";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

export function DailyLogPage({ controller }: { controller: DashboardController }) {
  const entries = [...controller.userState.activityEntries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

  return (
    <section className="grid w-[min(100%,760px)] gap-5 px-7 py-5 pb-8 max-[880px]:px-5">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl tracking-[-0.02em]">{t("nav.activity.label")}</h1>
          <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-muted-ink">{t("dailyLog.description")}</p>
        </div>
        <Button size="sm" type="button" onClick={() => controller.openDialog("activity")}><Icon name="plus" size={15} />{t("dailyLog.add")}</Button>
      </header>
      {entries.length ? (
        <div className="grid border-t border-border">
          {entries.map((entry) => (
            <article className="border-b border-border py-4" key={entry.id}>
              <header className="flex items-start justify-between gap-3">
                <div>
                  <time className="text-xs font-semibold tabular-nums text-muted-ink" dateTime={entry.loggedAt}>{formatDate(entry.loggedAt)}</time>
                  <h2 className="mt-[3px] text-[0.9375rem] tracking-[-0.01em]">{entry.activityName || t("body.recent.dailyEntry")}</h2>
                </div>
                <div className="flex gap-0.5">
                  <Button aria-label={t("common.edit")} size="icon-sm" type="button" variant="ghost" onClick={() => controller.editActivity(entry)}><Pencil /></Button>
                  <Button aria-label={t("common.delete")} size="icon-sm" type="button" variant="destructive" onClick={() => { if (window.confirm(t("intake.activity.deleteConfirm"))) void controller.deleteActivity(entry.id); }}><Trash2 /></Button>
                </div>
              </header>
              <dl className="mt-3 flex gap-5">
                {entry.durationMinutes ? <div className="grid gap-px"><dt className="text-xs text-muted-ink">{t("dailyLog.duration")}</dt><dd className="tabular-nums text-sm">{t("dailyLog.minutes", { count: entry.durationMinutes })}</dd></div> : null}
                {entry.cigarettes ? <div className="grid gap-px"><dt className="text-xs text-muted-ink">{t("intake.activity.cigarettes")}</dt><dd className="tabular-nums text-sm">{entry.cigarettes}</dd></div> : null}
                {entry.drinks ? <div className="grid gap-px"><dt className="text-xs text-muted-ink">{t("intake.activity.drinks")}</dt><dd className="tabular-nums text-sm">{entry.drinks}</dd></div> : null}
              </dl>
              {entry.notes ? <p className="mt-3 max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-muted-ink">{entry.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-[320px] place-items-center gap-2 py-8 text-center text-muted-ink [align-content:center]">
          <Icon name="activity" size={22} />
          <h2 className="mt-2 text-[0.9375rem] text-ink">{t("dailyLog.emptyTitle")}</h2>
          <p className="max-w-[44ch] text-sm leading-relaxed">{t("dailyLog.emptyDescription")}</p>
          <Button className="mt-2" size="sm" type="button" onClick={() => controller.openDialog("activity")}><Icon name="plus" size={15} />{t("dailyLog.add")}</Button>
        </div>
      )}
    </section>
  );
}
