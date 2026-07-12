import { CheckCircle2, CircleX, Clock3, FileSearch, LoaderCircle, MessageCircle, Square, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import type { BackgroundJob, DeveloperLog, LlmCall } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

export function DeveloperPage({ controller }: { controller: DashboardController }) {
  const jobs = controller.backgroundJobs.slice(0, 16);
  const calls = controller.llmCalls.slice(0, 8);
  const logs = controller.developerLogs.slice(0, 12);

  return (
    <div className="developer-page">
      <header className="developer-intro">
        <div>
          <h1>{t("developer.title")}</h1>
          <p>{t("developer.description")}</p>
          <p className="developer-privacy-note">{t("developer.privacy")}</p>
        </div>
        <Button disabled={!calls.length && !logs.length} size="sm" type="button" variant="outline" onClick={controller.clearDeveloperData}><Trash2 />{t("developer.clear")}</Button>
      </header>

      <Card className="developer-runs-surface">
        <CardHeader>
          <CardTitle>{t("developer.runs.title")}</CardTitle>
          <CardDescription>{t("developer.runs.description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.length ? <div className="developer-run-list">{jobs.map((job) => <RunRow controller={controller} job={job} key={job.id} />)}</div> : <DeveloperEmpty description={t("developer.runs.emptyDescription")} title={t("developer.runs.emptyTitle")} />}
        </CardContent>
      </Card>

      <details className="developer-diagnostics">
        <summary>{t("developer.diagnostics")}</summary>
        <p>{t("developer.diagnosticsDescription")}</p>
        <div className="developer-diagnostics-grid">
          <section>
            <h2>{t("developer.calls.title")}</h2>
            {calls.length ? <div className="developer-call-list">{calls.map((call) => <CallRow call={call} key={call.id} />)}</div> : <DeveloperEmpty description={t("developer.calls.emptyDescription")} title={t("developer.calls.emptyTitle")} />}
          </section>
          <section>
            <h2>{t("developer.logs.title")}</h2>
            {logs.length ? <div className="developer-log-list">{logs.map((log) => <LogRow log={log} key={log.id} />)}</div> : <DeveloperEmpty description={t("developer.logs.emptyDescription")} title={t("developer.logs.emptyTitle")} />}
          </section>
        </div>
      </details>
    </div>
  );
}

function RunRow({ controller, job }: { controller: DashboardController; job: BackgroundJob }) {
  const status = t(`jobs.status.${job.status}` as "jobs.status.running" | "jobs.status.completed" | "jobs.status.failed" | "jobs.status.cancelled");
  return (
    <article className="developer-run-row">
      <div className="developer-run-main">
        <RunIcon status={job.status} />
        <div><strong>{job.title}</strong><p>{job.description}</p></div>
      </div>
      <div className="developer-run-controls">
        <Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "secondary" : "outline"}>{status}</Badge>
        {job.status === "running" ? <Button size="sm" type="button" variant="outline" onClick={() => controller.cancelBackgroundJob(job.id)}><Square />{t("jobs.stop")}</Button> : null}
      </div>
      <details className="developer-run-details"><summary>{t("developer.run.view")}</summary><div><span>{t("developer.run.started")}</span><time dateTime={job.createdAt}>{formatTimestamp(job.createdAt)}</time>{job.finishedAt ? <><span>{t("developer.run.finished")}</span><time dateTime={job.finishedAt}>{formatTimestamp(job.finishedAt)}</time></> : null}{job.error ? <p>{job.error}</p> : null}</div></details>
      {job.status === "running" ? <Progress className="developer-run-progress" data-indeterminate={job.progress === null} value={job.progress ?? 0} /> : null}
    </article>
  );
}

function RunIcon({ status }: { status: BackgroundJob["status"] }) {
  if (status === "completed") return <CheckCircle2 aria-hidden="true" className="status-normal" />;
  if (status === "failed" || status === "cancelled") return <CircleX aria-hidden="true" className="status-attention" />;
  return <LoaderCircle aria-hidden="true" className="animate-spin text-primary" />;
}

function CallRow({ call }: { call: LlmCall }) {
  const status = t(`developer.status.${call.status}` as "developer.status.running" | "developer.status.completed" | "developer.status.failed");
  const kind = call.kind === "chat" ? t("developer.call.chat") : call.kind === "research" ? t("developer.call.research") : t("developer.call.document");
  return <details className="developer-call-row"><summary><span className="developer-call-icon">{call.kind === "chat" ? <MessageCircle /> : <FileSearch />}</span><span className="developer-call-main"><strong>{kind}</strong><span>{call.inputLabel || t("developer.notSet")}</span></span><Badge variant={call.status === "failed" ? "destructive" : call.status === "completed" ? "secondary" : "outline"}>{status}</Badge></summary><div className="developer-call-detail"><dl><div><dt>{t("developer.meta.command")}</dt><dd>{call.command}</dd></div><div><dt>{t("developer.meta.duration")}</dt><dd>{formatDuration(call.durationMs)}</dd></div><div><dt>{t("developer.meta.outputChars")}</dt><dd>{new Intl.NumberFormat("en").format(call.outputChars)}</dd></div></dl>{call.error ? <p>{call.error}</p> : null}</div></details>;
}

function LogRow({ log }: { log: DeveloperLog }) {
  return <article className={`developer-log-row developer-log-${log.level}`}><div><LogIcon level={log.level} /><span><strong>{log.message}</strong><time dateTime={log.createdAt}>{formatTimestamp(log.createdAt)}</time>{log.detail ? <p>{log.detail}</p> : null}</span></div></article>;
}

function LogIcon({ level }: { level: DeveloperLog["level"] }) {
  if (level === "success") return <CheckCircle2 aria-hidden="true" className="status-normal" />;
  if (level === "error") return <CircleX aria-hidden="true" className="status-attention" />;
  return <Clock3 aria-hidden="true" className="text-primary" />;
}

function DeveloperEmpty({ title, description }: { title: string; description: string }) {
  return <Empty className="border-0 px-5 py-8"><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("developer.notSet");
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDuration(value: number | null): string {
  if (value === null) return t("developer.inProgress");
  if (value < 1_000) return t("developer.duration.ms", { count: value });
  return t("developer.duration.seconds", { count: (value / 1_000).toFixed(1) });
}
