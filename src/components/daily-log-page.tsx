import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "../dashboard-format";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

export function DailyLogPage({ controller }: { controller: DashboardController }) {
  const entries = [...controller.userState.activityEntries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

  return (
    <section className="daily-log-page">
      <header className="daily-log-heading">
        <div><h1>{t("nav.activity.label")}</h1><p>{t("dailyLog.description")}</p></div>
        <Button size="sm" type="button" onClick={() => controller.openDialog("activity")}><Icon name="plus" size={15} />{t("dailyLog.add")}</Button>
      </header>
      {entries.length ? <div className="daily-log-list">
        {entries.map((entry) => (
          <article className="daily-log-entry" key={entry.id}>
            <header>
              <div><time dateTime={entry.loggedAt}>{formatDate(entry.loggedAt)}</time><h2>{entry.activityName || t("body.recent.dailyEntry")}</h2></div>
              <div className="daily-log-actions">
                <Button aria-label={t("common.edit")} size="icon-sm" type="button" variant="ghost" onClick={() => controller.editActivity(entry)}><Pencil /></Button>
                <Button aria-label={t("common.delete")} size="icon-sm" type="button" variant="destructive" onClick={() => { if (window.confirm(t("intake.activity.deleteConfirm"))) void controller.deleteActivity(entry.id); }}><Trash2 /></Button>
              </div>
            </header>
            <dl>
              {entry.durationMinutes ? <div><dt>{t("dailyLog.duration")}</dt><dd>{t("dailyLog.minutes", { count: entry.durationMinutes })}</dd></div> : null}
              {entry.cigarettes ? <div><dt>{t("intake.activity.cigarettes")}</dt><dd>{entry.cigarettes}</dd></div> : null}
              {entry.drinks ? <div><dt>{t("intake.activity.drinks")}</dt><dd>{entry.drinks}</dd></div> : null}
            </dl>
            {entry.notes ? <p>{entry.notes}</p> : null}
          </article>
        ))}
      </div> : <div className="daily-log-empty"><Icon name="activity" size={22} /><h2>{t("dailyLog.emptyTitle")}</h2><p>{t("dailyLog.emptyDescription")}</p><Button size="sm" type="button" onClick={() => controller.openDialog("activity")}><Icon name="plus" size={15} />{t("dailyLog.add")}</Button></div>}
    </section>
  );
}
