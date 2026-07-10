import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate } from "../dashboard-format";
import { resultDocumentAccept } from "../document-intake";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { ImportCoverageTimeline } from "./charts/import-coverage-timeline";
import { FileText, Sparkles } from "./health-icons";
import { ReportResultsDialog } from "./report-results-dialog";

export function DocumentsPage({ controller }: { controller: DashboardController }) {
  return (
    <div className="documents-page">
      <header className="documents-heading"><div><h1>{t("documents.title")}</h1><p>{t("documents.description")}</p></div><span>{t("database.localRecords")}</span></header>
      <section className="document-intake" aria-label={t("documents.title")}>
        <DocumentDrop accept={resultDocumentAccept} description={t("documents.pdfDescription")} icon={<FileText />} inputId="document-result-file" label={t("documents.pdfLabel")} onFile={controller.prepareDocumentResult} />
        <DocumentDrop accept={resultDocumentAccept} description={t("genetics.uploadDescription")} icon={<Sparkles />} inputId="genetic-report-file" label={t("genetics.uploadLabel")} onFile={controller.prepareDocumentResult} />
        <DocumentDrop accept=".xml,application/xml,text/xml" description={t("documents.appleDescription")} icon={<Sparkles />} inputId="apple-health-export-file" label={t("documents.appleLabel")} onFile={(file) => void controller.importAppleHealthFile(file)} />
      </section>
      <details className="genetics-context"><summary>{t("genetics.safetyTitle")}</summary><p>{t("genetics.safetyDescription")}</p><p>{t("genetics.notSupportedRisk")}</p></details>
      <ImportCoverageTimeline imports={controller.userState.appleHealthImports} reports={controller.display.labReports} />
      <LabReports controller={controller} />
      <AppleHealthImports controller={controller} />
    </div>
  );
}

function DocumentDrop({
  accept,
  description,
  icon,
  inputId,
  label,
  onFile,
}: {
  accept: string;
  description: string;
  icon: ReactNode;
  inputId: string;
  label: string;
  onFile: (file: File) => void;
}) {
  const descriptionId = `${inputId}-description`;

  function handleFile(file: File | undefined): void {
    if (file) onFile(file);
  }
  return (
    <Field
      className="document-drop"
      data-document-drop
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFile(event.dataTransfer.files[0]);
      }}
    >
      <span className="document-drop-icon">{icon}</span>
      <span className="document-drop-copy"><FieldLabel htmlFor={inputId}>{label}</FieldLabel><FieldDescription id={descriptionId}>{description}</FieldDescription></span>
      <Input
        accept={accept}
        aria-describedby={descriptionId}
        id={inputId}
        type="file"
        onChange={(event) => {
          handleFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </Field>
  );
}

function LabReports({ controller }: { controller: DashboardController }) {
  const reports = controller.display.labReports;
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const selectedReport = reports.find((report) => report.id === selectedReportId) || null;
  if (reports.length === 0) {
    return (
      <Empty className="min-h-40">
        <EmptyHeader>
          <EmptyTitle>{t("documents.emptyReportsTitle")}</EmptyTitle>
          <EmptyDescription>{t("documents.emptyReportsDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="documents-list-section grid gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("documents.savedReports")}</h3>
      {reports.map((report) => (
        <div className="documents-list-row grid gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5" key={report.id}>
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><FileText /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <strong className="truncate text-sm">{report.sourceName}</strong>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(report.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("documents.reportStats", { count: report.resultCount, type: report.fileType || t("documents.unknownType"), size: report.sizeLabel || t("documents.unknownSize") })}</p>
              {report.localCopyPath ? <p className="truncate text-xs text-muted-foreground" title={report.localCopyPath}>{report.localCopyPath}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setSelectedReportId(report.id)}>{t("documents.viewResults")}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void controller.unlinkLabReport(report.id)}>{t("documents.unlink")}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { if (window.confirm(t("documents.deleteReportConfirm"))) void controller.deleteLabReport(report.id, false); }}>{t("documents.deleteReport")}</Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => { if (window.confirm(t("documents.deleteReportResultsConfirm"))) void controller.deleteLabReport(report.id, true); }}>{t("documents.deleteReportResults")}</Button>
          </div>
        </div>
      ))}
      <ReportResultsDialog controller={controller} report={selectedReport} onClose={() => setSelectedReportId(null)} />
    </div>
  );
}

function AppleHealthImports({ controller }: { controller: DashboardController }) {
  const imports = controller.userState.appleHealthImports.slice(0, 4);
  if (imports.length === 0) {
    return (
      <Empty className="min-h-40">
        <EmptyHeader>
          <EmptyTitle>{t("documents.emptyAppleTitle")}</EmptyTitle>
          <EmptyDescription>{t("documents.emptyAppleDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="documents-list-section grid gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("documents.recentImports")}</h3>
      {imports.map((item) => (
        <div className="documents-list-row flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5" key={item.id || item.importedAt}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Sparkles /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <strong className="truncate text-sm">{item.sourceName}</strong>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.importedAt)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("documents.importStats", { records: item.recordCount, workouts: item.workoutCount })}
              {item.startedAt ? <> · {formatDate(item.startedAt)} – {formatDate(item.endedAt)}</> : null}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
