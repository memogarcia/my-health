import { CheckCircle2, CircleX, ListTodo, LoaderCircle, Square, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "../dashboard-format"
import type { BackgroundJob, BackgroundJobStatus } from "../dashboard-model"
import { t } from "../i18n"
import type { DashboardController } from "../use-dashboard-controller"

export function JobCenter({ controller }: { controller: DashboardController }) {
  const jobs = controller.backgroundJobs.slice(0, 12)
  const hasFinished = jobs.some((job) => job.status !== "running")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={t("jobs.button")} title={t("jobs.description")}>
          <ListTodo data-icon="inline-start" />
          <span className="sr-only">{t("jobs.button")}</span>
          {controller.activeBackgroundJobCount ? <Badge variant="secondary">{controller.activeBackgroundJobCount}</Badge> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-2rem))]">
        <PopoverHeader>
          <div className="flex items-center justify-between gap-3">
            <PopoverTitle>{t("jobs.title")}</PopoverTitle>
            {hasFinished ? (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("jobs.clearFinished")} title={t("jobs.clearFinished")} onClick={controller.clearFinishedBackgroundJobs}>
                <Trash2 data-icon="inline-start" />
              </Button>
            ) : null}
          </div>
          <PopoverDescription>{t("jobs.description")}</PopoverDescription>
        </PopoverHeader>
        <Separator />
        {jobs.length ? (
          <div className="grid max-h-[min(30rem,60vh)] gap-2 overflow-y-auto pr-0.5">
            {jobs.map((job) => <JobRow controller={controller} job={job} key={job.id} />)}
          </div>
        ) : (
          <Empty className="border-0 px-2 py-6">
            <EmptyHeader>
              <EmptyTitle>{t("jobs.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("jobs.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </PopoverContent>
    </Popover>
  )
}

function JobRow({ controller, job }: { controller: DashboardController; job: BackgroundJob }) {
  const statusLabel = t(`jobs.status.${job.status}` as "jobs.status.running" | "jobs.status.completed" | "jobs.status.failed" | "jobs.status.cancelled")
  return (
    <article className="job-row grid gap-2 rounded-md border border-border bg-card p-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <JobStatusIcon status={job.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <strong className="truncate text-sm">{job.title}</strong>
            <span className="flex items-center gap-1"><Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "secondary" : "outline"}>{statusLabel}</Badge>{job.status === "running" ? <Button aria-label={t("jobs.stop")} onClick={() => controller.cancelBackgroundJob(job.id)} size="icon-xs" title={t("jobs.stop")} type="button" variant="ghost"><Square /></Button> : null}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{job.description}</p>
          {job.error ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-destructive">{job.error}</p> : null}
        </div>
      </div>
      {job.status === "running" ? (
        <div className="grid gap-1.5 pl-7">
          <div className="flex items-center justify-between gap-2 text-[0.68rem] text-muted-foreground">
            <span>{job.progress === null ? t("jobs.progress.inProgress") : t("jobs.progress.percent", { progress: job.progress })}</span>
            <span>{t("jobs.created", { date: formatDate(job.createdAt) })}</span>
          </div>
          <Progress className="job-progress" data-indeterminate={job.progress === null} value={job.progress ?? 0} />
        </div>
      ) : (
        <p className="pl-7 text-[0.68rem] text-muted-foreground">{t("jobs.created", { date: formatDate(job.createdAt) })}</p>
      )}
    </article>
  )
}

function JobStatusIcon({ status }: { status: BackgroundJobStatus }) {
  if (status === "completed") return <CheckCircle2 aria-hidden="true" className="status-normal mt-0.5 shrink-0" />
  if (status === "failed" || status === "cancelled") return <CircleX aria-hidden="true" className="status-attention mt-0.5 shrink-0" />
  return <LoaderCircle aria-hidden="true" className="mt-0.5 shrink-0 animate-spin text-primary" />
}
