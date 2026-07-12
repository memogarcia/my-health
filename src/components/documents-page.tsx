import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate } from "../dashboard-format";
import { resultDocumentAccept } from "../document-intake";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { FileText, Sparkles } from "./health-icons";
import { ReportResultsDialog } from "./report-results-dialog";

export function DocumentsPage({ controller }: { controller: DashboardController }) {
  const reports = controller.display.labReports;
  const imports = controller.userState.appleHealthImports;
  return (
    <div className="mx-auto grid w-full max-w-[1040px] gap-8 px-8 py-7 max-[880px]:px-5">
      <header className="grid gap-3 border-b border-border/55 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1.5">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">{t("documents.title")}</h1>
            <p className="max-w-[68ch] text-sm leading-relaxed text-muted-ink">{t("documents.description")}</p>
          </div>
          <div className="flex gap-5 text-right">
            <SummaryMetric label={t("documents.savedReports")} value={reports.length} />
            <SummaryMetric label={t("documents.recentImports")} value={imports.length} />
          </div>
        </div>
      </header>

      <section className="grid gap-3" aria-labelledby="document-sources-title">
        <div className="grid gap-1"><h2 className="text-sm font-semibold" id="document-sources-title">{t("documents.sourcesTitle")}</h2><p className="text-xs leading-relaxed text-muted-ink">{t("documents.sourcesDescription")}</p></div>
        <div className="grid overflow-hidden rounded-xl border border-border/60 bg-surface md:grid-cols-2">
          <DocumentDrop accept={resultDocumentAccept} description={t("documents.pdfDescription")} icon={<FileText />} inputId="document-result-file" label={t("documents.pdfLabel")} onFile={controller.prepareDocumentResult} />
          <DocumentDrop accept=".xml,application/xml,text/xml" description={t("documents.appleDescription")} icon={<Sparkles />} inputId="apple-health-export-file" label={t("documents.appleLabel")} onFile={(file) => void controller.importAppleHealthFile(file)} />
        </div>
      </section>

      <LabReports controller={controller} />
      <AppleHealthImports controller={controller} />
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return <div className="grid gap-0.5"><strong className="text-base tabular-nums">{value}</strong><span className="text-[11px] text-muted-ink">{label}</span></div>;
}

function DocumentDrop({ accept, description, icon, inputId, label, onFile }: { accept: string; description: string; icon: ReactNode; inputId: string; label: string; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = `${inputId}-description`;
  function handleFile(file: File | undefined): void { if (file) onFile(file); }
  return (
    <Field
      className="grid min-h-36 gap-4 border-b border-border/60 p-5 transition-colors hover:bg-secondary/45 focus-within:bg-secondary/45 md:border-b-0 md:border-r md:last:border-r-0"
      data-document-drop
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]); }}
    >
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink">{icon}</span><div className="grid min-w-0 gap-1"><FieldLabel className="text-sm font-semibold text-ink" htmlFor={inputId}>{label}</FieldLabel><FieldDescription className="text-xs leading-relaxed text-muted-ink" id={descriptionId}>{description}</FieldDescription></div></div>
      <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-medium text-quiet">{t("documents.dropHint")}</span><Button className="whitespace-nowrap" size="sm" type="button" variant="outline" onClick={() => inputRef.current?.click()}>{t("documents.chooseFile")}</Button></div>
      <Input accept={accept} aria-describedby={descriptionId} className="sr-only" id={inputId} ref={inputRef} tabIndex={-1} type="file" onChange={(event) => { handleFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
    </Field>
  );
}

function LabReports({ controller }: { controller: DashboardController }) {
  const reports = controller.display.labReports;
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const selectedReport = reports.find((report) => report.id === selectedReportId) || null;
  return (
    <section className="grid gap-3" aria-labelledby="saved-reports-title">
      <div className="grid gap-1"><h2 className="text-sm font-semibold" id="saved-reports-title">{t("documents.savedReports")}</h2><p className="text-xs leading-relaxed text-muted-ink">{t("documents.savedReportsDescription")}</p></div>
      {reports.length === 0 ? <Empty className="min-h-36 border-y border-dashed border-border py-6"><EmptyHeader><EmptyTitle>{t("documents.emptyReportsTitle")}</EmptyTitle><EmptyDescription>{t("documents.emptyReportsDescription")}</EmptyDescription></EmptyHeader></Empty> : <div className="divide-y divide-border/55 border-y border-border/60">{reports.map((report) => <div className="grid gap-4 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={report.id}><div className="flex min-w-0 items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-primary"><FileText /></span><div className="min-w-0"><strong className="block truncate text-sm">{report.sourceName}</strong><p className="mt-1 text-xs leading-relaxed text-muted-ink">{t("documents.reportStats", { count: report.resultCount, type: report.fileType || t("documents.unknownType"), size: report.sizeLabel || t("documents.unknownSize") })}</p><p className="mt-0.5 text-[11px] text-quiet">{formatDate(report.createdAt)}</p>{report.localCopyPath ? <p className="mt-0.5 truncate text-[11px] text-quiet" title={report.localCopyPath}>{t("documents.localCopy", { path: report.localCopyPath })}</p> : null}</div></div><div className="flex flex-wrap gap-2 sm:justify-end"><Button type="button" size="sm" onClick={() => setSelectedReportId(report.id)}>{t("documents.viewResults")}</Button><details className="relative"><summary className="inline-flex min-h-7 cursor-pointer list-none items-center rounded-md border border-border px-2.5 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">{t("documents.manageReport")}</summary><div className="absolute right-0 top-[calc(100%+5px)] z-20 grid min-w-[190px] w-max gap-1 rounded-lg border border-border bg-surface p-1 shadow-[var(--elev-2)]"><Button className="justify-start" type="button" size="sm" variant="outline" onClick={() => void controller.unlinkLabReport(report.id)}>{t("documents.unlink")}</Button><Button className="justify-start" type="button" size="sm" variant="outline" onClick={() => { if (window.confirm(t("documents.deleteReportConfirm"))) void controller.deleteLabReport(report.id, false); }}>{t("documents.deleteReport")}</Button><Button className="justify-start" type="button" size="sm" variant="destructive" onClick={() => { if (window.confirm(t("documents.deleteReportResultsConfirm"))) void controller.deleteLabReport(report.id, true); }}>{t("documents.deleteReportResults")}</Button></div></details></div></div>)}</div>}
      <ReportResultsDialog controller={controller} report={selectedReport} onClose={() => setSelectedReportId(null)} />
    </section>
  );
}

function AppleHealthImports({ controller }: { controller: DashboardController }) {
  const imports = controller.userState.appleHealthImports;
  return (
    <section className="grid gap-3" aria-labelledby="apple-imports-title">
      <div className="grid gap-1"><h2 className="text-sm font-semibold" id="apple-imports-title">{t("documents.appleArchiveTitle")}</h2><p className="text-xs leading-relaxed text-muted-ink">{t("documents.appleArchiveDescription")}</p></div>
      {imports.length === 0 ? <Empty className="min-h-36 border-y border-dashed border-border py-6"><EmptyHeader><EmptyTitle>{t("documents.emptyAppleTitle")}</EmptyTitle><EmptyDescription>{t("documents.emptyAppleDescription")}</EmptyDescription></EmptyHeader></Empty> : <div className="divide-y divide-border/55 border-y border-border/60">{imports.map((item) => <div className="flex items-start gap-3 px-1 py-4" key={item.id || item.importedAt}><span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-primary"><Sparkles /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="truncate text-sm">{item.sourceName}</strong><span className="text-[11px] text-quiet">{formatDate(item.importedAt)}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-ink">{t("documents.importStats", { records: item.recordCount, workouts: item.workoutCount })}{item.startedAt ? <> · {formatDate(item.startedAt)} – {formatDate(item.endedAt)}</> : null}</p></div><Button aria-label={t("documents.deleteAppleImport", { name: item.sourceName })} onClick={() => { if (window.confirm(t("documents.deleteAppleImportConfirm"))) void controller.deleteAppleHealthImport(item.id || item.importedAt); }} size="icon-sm" type="button" variant="destructive"><Trash2 /></Button></div>)}</div>}
    </section>
  );
}
