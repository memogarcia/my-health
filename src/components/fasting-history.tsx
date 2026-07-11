import { Activity, CheckCircle2, Clock, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "../dashboard-format";
import type { FastingSession } from "../fasting-state";
import { t } from "../i18n";
import { formatElapsed } from "./fasting-format";

export function FastingHistory({ sessions, onDelete }: { sessions: FastingSession[]; onDelete: (id: string) => void }) {
  return (
    <section className="mt-8 rounded-[2.5rem] border border-border/40 bg-surface/30 px-8 py-8 shadow-lg backdrop-blur-xl transition-all hover:bg-surface/50" aria-labelledby="fasting-history-title">
      <div className="flex items-center justify-between mb-6">
        <h2 id="fasting-history-title" className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Clock className="size-6 text-primary" />
          {t("fasting.history.title")}
        </h2>
        <div className="h-px flex-1 ml-6 bg-gradient-to-r from-border/50 to-transparent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session, i) => {
          const sessionDuration = Math.max(0, Math.floor((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000));
          const goalReached = sessionDuration >= (session.targetHours * 3600);

          return (
            <div
              key={session.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-border/40 bg-canvas/40 p-6 backdrop-blur-md transition-all duration-300 hover:bg-surface hover:shadow-xl hover:-translate-y-1 hover:border-border/80 overflow-hidden"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -z-10 transition-opacity duration-500",
                goalReached ? "bg-normal/20 group-hover:opacity-100 opacity-0" : "bg-primary/10 group-hover:opacity-100 opacity-0"
              )} />

              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-ink/80 flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(session.startedAt)}
                  </span>
                  <strong className="text-3xl font-black tracking-tight text-ink tnum drop-shadow-sm">
                    {formatElapsed(sessionDuration)}
                  </strong>
                </div>

                {goalReached ? (
                  <div className="size-8 rounded-full bg-normal/10 flex items-center justify-center text-normal border border-normal/20">
                    <CheckCircle2 className="size-4" />
                  </div>
                ) : (
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Activity className="size-4" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-muted-ink border border-border/50 shadow-sm">
                  <Target className="size-3" />
                  {t("fasting.history.target", { hours: session.targetHours })}
                </span>
                <Button
                  aria-label={t("fasting.history.deleteLabel", { date: formatDate(session.startedAt) })}
                  onClick={() => { if (window.confirm(t("fasting.history.deleteConfirm"))) onDelete(session.id); }}
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full text-muted-ink hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
