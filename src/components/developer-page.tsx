import { Bug, CheckCircle2, CircleX, Clock3, FileSearch, MessageCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { DeveloperLog, LlmCall } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

export function DeveloperPage({ controller }: { controller: DashboardController }) {
  const calls = controller.llmCalls.slice(0, 24);
  const logs = controller.developerLogs.slice(0, 60);
  const failedCalls = calls.filter((call) => call.status === "failed").length;

  return (
    <div className="developer-page grid gap-4">
      <section className="developer-intro flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="developer-intro-icon"><Bug aria-hidden="true" /></span>
          <div className="grid gap-1">
            <h2>{t("developer.title")}</h2>
            <p>{t("developer.description")}</p>
            <p className="developer-privacy-note">{t("developer.privacy")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!calls.length && !logs.length} onClick={controller.clearDeveloperData}>
          <Trash2 data-icon="inline-start" />
          {t("developer.clear")}
        </Button>
      </section>

      <div className="developer-summary grid gap-2 sm:grid-cols-3">
        <SummaryItem label={t("developer.summary.calls")} value={calls.length} />
        <SummaryItem label={t("developer.summary.failures")} value={failedCalls} />
        <SummaryItem label={t("developer.summary.logs")} value={logs.length} />
      </div>

      <div className="developer-grid grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card className="developer-calls-surface">
          <CardHeader>
            <CardTitle>{t("developer.calls.title")}</CardTitle>
            <CardDescription>{t("developer.calls.description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {calls.length ? <div className="developer-call-list">{calls.map((call) => <CallRow call={call} key={call.id} />)}</div> : <DeveloperEmpty title={t("developer.calls.emptyTitle")} description={t("developer.calls.emptyDescription")} />}
          </CardContent>
        </Card>

        <Card className="developer-logs-surface">
          <CardHeader>
            <CardTitle>{t("developer.logs.title")}</CardTitle>
            <CardDescription>{t("developer.logs.description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length ? <div className="developer-log-list">{logs.map((log) => <LogRow log={log} key={log.id} />)}</div> : <DeveloperEmpty title={t("developer.logs.emptyTitle")} description={t("developer.logs.emptyDescription")} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return <div className="developer-summary-item"><span>{label}</span><strong className="tnum">{value}</strong></div>;
}

function CallRow({ call }: { call: LlmCall }) {
  const statusLabel = t(`developer.status.${call.status}` as "developer.status.running" | "developer.status.completed" | "developer.status.failed");
  const kindLabel = call.kind === "chat" ? t("developer.call.chat") : t("developer.call.document");
  return (
    <details className="developer-call-row">
      <summary>
        <span className="developer-call-icon">{call.kind === "chat" ? <MessageCircle aria-hidden="true" /> : <FileSearch aria-hidden="true" />}</span>
        <span className="developer-call-main">
          <strong>{kindLabel}</strong>
          <span>{call.inputLabel || t("developer.notSet")}</span>
        </span>
        <span className="developer-call-time">{formatTimestamp(call.startedAt)}</span>
        <Badge variant={call.status === "failed" ? "destructive" : call.status === "completed" ? "secondary" : "outline"}>{statusLabel}</Badge>
      </summary>
      <div className="developer-call-detail">
        <dl className="developer-meta-grid">
          <Meta label={t("developer.meta.command")} value={call.command} code />
          <Meta label={t("developer.meta.model")} value={call.modelId || t("developer.notSet")} />
          <Meta label={t("developer.meta.reasoning")} value={call.reasoningEffort || t("developer.notSet")} />
          <Meta label={t("developer.meta.started")} value={formatTimestamp(call.startedAt)} />
          <Meta label={t("developer.meta.duration")} value={formatDuration(call.durationMs)} />
          <Meta label={t("developer.meta.promptChars")} value={formatNumber(call.promptChars)} />
          <Meta label={t("developer.meta.fileBytes")} value={formatBytes(call.fileBytes)} />
          <Meta label={t("developer.meta.pages")} value={formatNumber(call.renderedPages)} />
          <Meta label={t("developer.meta.outputChars")} value={formatNumber(call.outputChars)} />
        </dl>
        {call.error ? <pre className="developer-error">{call.error}</pre> : null}
      </div>
    </details>
  );
}

function Meta({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return <div><dt>{label}</dt><dd className={code ? "developer-code" : undefined}>{value}</dd></div>;
}

function LogRow({ log }: { log: DeveloperLog }) {
  return (
    <article className={`developer-log-row developer-log-${log.level}`}>
      <div className="flex items-start gap-2">
        <LogIcon level={log.level} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <strong>{log.message}</strong>
            <time dateTime={log.createdAt}>{formatTimestamp(log.createdAt)}</time>
          </div>
          {log.detail ? <p>{log.detail}</p> : null}
        </div>
      </div>
    </article>
  );
}

function LogIcon({ level }: { level: DeveloperLog["level"] }) {
  if (level === "success") return <CheckCircle2 aria-hidden="true" className="status-normal" />;
  if (level === "error") return <CircleX aria-hidden="true" className="status-attention" />;
  return <Clock3 aria-hidden="true" className="text-primary" />;
}

function DeveloperEmpty({ title, description }: { title: string; description: string }) {
  return <Empty className="border-0 px-6 py-12"><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>;
}

function formatTimestamp(value: string): string {
  if (!value) return t("developer.notSet");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("developer.notSet");
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDuration(value: number | null): string {
  if (value === null) return t("developer.inProgress");
  if (value < 1_000) return t("developer.duration.ms", { count: value });
  return t("developer.duration.seconds", { count: (value / 1_000).toFixed(1) });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function formatBytes(value: number): string {
  if (!value) return t("developer.notSet");
  if (value < 1_024) return t("developer.bytes", { count: value });
  return t("developer.kilobytes", { count: Math.round(value / 1_024) });
}
