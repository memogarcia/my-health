import { CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/dashboard-format";
import type { FastingSession } from "@/fasting-state";
import { t } from "@/i18n";
import { formatElapsed } from "@/components/fasting-format";

export function FastingHistory({ sessions, onDelete }: { sessions: FastingSession[]; onDelete: (id: string) => void }) {
  return (
    <section aria-labelledby="fasting-history-title">
      <div className="flex items-center justify-between gap-3 border-b border-border/55 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink" id="fasting-history-title"><Clock className="size-4 text-muted-ink" />{t("fasting.history.title")}</h2>
        <span className="text-xs tabular-nums text-muted-ink">{sessions.length}</span>
      </div>
      <div>
        {sessions.map((session) => {
          const duration = Math.max(0, Math.floor((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000));
          const goalReached = duration >= session.targetHours * 3600;
          return (
            <article className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-border/45 py-3.5" key={session.id}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-semibold tabular-nums text-ink">{formatElapsed(duration)}</strong>
                  {goalReached ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-normal"><CheckCircle2 className="size-3" />{t("fasting.history.complete")}</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-ink">{formatDate(session.startedAt)}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-ink">{t("fasting.history.target", { hours: session.targetHours })}</span>
              <Button aria-label={t("fasting.history.deleteLabel", { date: formatDate(session.startedAt) })} onClick={() => { if (window.confirm(t("fasting.history.deleteConfirm"))) onDelete(session.id); }} size="icon-xs" type="button" variant="destructive"><Trash2 /></Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
