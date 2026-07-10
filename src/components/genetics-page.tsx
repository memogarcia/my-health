import { useEffect, useState } from "react";
import { Dna, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatDate } from "../dashboard-format";
import { formatAge, type BiologicalAgeReport } from "../genetics-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { BiologicalAgeChart } from "./charts/biological-age-chart";
import { GeneticReportForm } from "./genetic-report-form";

export function GeneticsPage({ controller }: { controller: DashboardController }) {
  const reports = controller.display.biologicalAgeReports;
  const [selectedId, setSelectedId] = useState<number | null>(reports[0]?.id ?? null);
  const [editing, setEditing] = useState<BiologicalAgeReport | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const selected = reports.find((report) => report.id === selectedId) || reports[0] || null;

  useEffect(() => {
    if (!reports.some((report) => report.id === selectedId)) {
      setSelectedId(reports[0]?.id ?? null);
    }
  }, [reports, selectedId]);

  function finishForm(): void {
    setEditing(null);
    setFormVersion((value) => value + 1);
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.22fr)]">
      <GeneticReportForm
        controller={controller}
        key={editing ? `edit-${editing.id}` : `new-${formVersion}`}
        report={editing}
        onCancel={() => setEditing(null)}
        onSaved={finishForm}
      />
      <section className="grid gap-4" aria-label={t("genetics.recordsLabel")}>
        {selected ? (
          <>
            <ReportOverview report={selected} onEdit={() => setEditing(selected)} onDelete={() => {
              if (!window.confirm(t("genetics.deleteConfirm"))) return;
              void controller.deleteBiologicalAgeReport(selected.id).then((deleted) => {
                if (deleted) setEditing(null);
              });
            }} />
            <Card>
              <CardContent><BiologicalAgeChart report={selected} /></CardContent>
            </Card>
          </>
        ) : (
          <Empty className="min-h-64 border border-dashed bg-muted/20">
            <EmptyMedia variant="icon"><Dna /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t("genetics.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("genetics.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <ReportHistory reports={reports} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
      </section>
    </div>
  );
}

function ReportOverview({
  report,
  onEdit,
  onDelete,
}: {
  report: BiologicalAgeReport;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const difference = report.overallAge - report.chronologicalAge;
  const differenceText = difference > 0
    ? t("genetics.delta.older", { count: formatAge(Math.abs(difference)) })
    : difference < 0
      ? t("genetics.delta.younger", { count: formatAge(Math.abs(difference)) })
      : t("genetics.delta.same");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{report.reportName}</CardTitle>
        <CardDescription>
          {[report.provider, formatDate(report.collectedAt)].filter(Boolean).join(" · ")}
        </CardDescription>
        <div className="flex flex-wrap justify-end gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}><Pencil className="size-3.5" />{t("common.edit")}</Button>
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="size-3.5" />{t("common.delete")}</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryValue label={t("genetics.summary.chronological")} value={formatAge(report.chronologicalAge)} />
          <SummaryValue label={t("genetics.summary.biological")} value={formatAge(report.overallAge)} />
          <SummaryValue label={t("genetics.summary.difference")} value={differenceText} compact />
          <SummaryValue
            label={t("genetics.summary.percentile")}
            value={report.percentile === null ? t("genetics.summary.notReported") : `${formatAge(report.percentile)}%`}
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("genetics.advisory")}</p>
        {report.notes ? <p className="text-sm leading-relaxed text-muted-foreground">{report.notes}</p> : null}
      </CardContent>
    </Card>
  );
}

function SummaryValue({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <strong className={compact ? "mt-1 block text-sm font-semibold" : "mt-1 block text-lg font-semibold tnum"}>{value}</strong>
    </div>
  );
}

function ReportHistory({
  reports,
  selectedId,
  onSelect,
}: {
  reports: BiologicalAgeReport[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (reports.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("genetics.history.title")}</CardTitle>
        <CardDescription>{t("genetics.history.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {reports.map((report) => {
          const selected = report.id === selectedId;
          return (
            <button
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={report.id}
              onClick={() => onSelect(report.id)}
              type="button"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Dna className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{report.reportName}</strong>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(report.collectedAt)} · {t("genetics.history.scoreCount", { count: report.systemScores.length })}
                </span>
              </span>
              <Badge variant={selected ? "default" : "outline"}>{selected ? t("genetics.history.selected") : t("genetics.history.view")}</Badge>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
