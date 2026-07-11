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
  return (
    <div className="grid max-w-[960px] gap-5">
      <header className="flex items-start justify-between gap-5">
        <div>
          <h1 className="text-xl tracking-[-0.02em]">{t("documents.title")}</h1>
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-ink">{t("documents.description")}</p>
        </div>
        <span className="inline-flex min-w-max items-center rounded-full bg-secondary px-[8px] py-[5px] text-xs text-muted-ink">{t("database.localRecords")}</span>
      </header>
      <section aria-label={t("documents.title")} className="grid grid-cols-[repeat(2,minmax(0,1fr))] border-y border-border max-[880px]:grid-cols-1">
        <DocumentDrop accept={resultDocumentAccept} description={t("documents.pdfDescription")} icon={<FileText />} inputId="document-result-file" label={t("documents.pdfLabel")} onFile={controller.prepareDocumentResult} />
        <DocumentDrop accept=".xml,application/xml,text/xml" description={t("documents.appleDescription")} icon={<Sparkles />} inputId="apple-health-export-file" label={t("documents.appleLabel")} onFile={(file) => void controller.importAppleHealthFile(file)} />
      </section>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = `${inputId}-description`;

  function handleFile(file: File | undefined): void {
    if (file) onFile(file);
  }
  return (
    <Field
      className="grid min-h-[96px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-none border-0 border-r border-border bg-transparent p-4 transition-colors hover:bg-secondary focus-within:bg-secondary [&:last-child]:border-r-0 max-[880px]:border-r-0 max-[880px]:border-b max-[880px]:[&:last-child]:border-b-0"
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
      <span className="grid size-[34px] place-items-center rounded-sm bg-accent text-accent-ink">{icon}</span>
      <span className="grid min-w-0 gap-[3px]"><FieldLabel className="text-sm font-semibold text-ink" htmlFor={inputId}>{label}</FieldLabel><FieldDescription className="line-clamp-2 text-xs text-muted-ink" id={descriptionId}>{description}</FieldDescription></span>
      <Button className="whitespace-nowrap" size="sm" type="button" variant="outline" onClick={() => inputRef.current?.click()}>{t("documents.chooseFile")}</Button>
      <Input
        accept={accept}
        aria-describedby={descriptionId}
        className="sr-only"
        id={inputId}
        ref={inputRef}
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
    <div className="grid gap-2 border-t border-border pt-3">
      <h3 className="pb-2 text-xs font-semibold text-muted-ink">{t("documents.savedReports")}</h3>
      {reports.map((report) => (
        <div className="grid gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5" key={report.id}>
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
            <details className="relative">
              <summary className="inline-flex min-h-8 cursor-pointer list-none rounded-sm border border-border px-2.5 py-[7px] text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">{t("documents.manageReport")}</summary>
              <div className="absolute right-0 top-[calc(100%+5px)] z-20 grid min-w-[180px] w-max gap-1 rounded-lg border border-border bg-surface p-1 shadow-[var(--elev-2)]">
                <Button className="justify-start" type="button" size="sm" variant="outline" onClick={() => void controller.unlinkLabReport(report.id)}>{t("documents.unlink")}</Button>
                <Button className="justify-start" type="button" size="sm" variant="outline" onClick={() => { if (window.confirm(t("documents.deleteReportConfirm"))) void controller.deleteLabReport(report.id, false); }}>{t("documents.deleteReport")}</Button>
                <Button className="justify-start" type="button" size="sm" variant="destructive" onClick={() => { if (window.confirm(t("documents.deleteReportResultsConfirm"))) void controller.deleteLabReport(report.id, true); }}>{t("documents.deleteReportResults")}</Button>
              </div>
            </details>
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
    <div className="grid gap-2 border-t border-border pt-3">
      <h3 className="pb-2 text-xs font-semibold text-muted-ink">{t("documents.recentImports")}</h3>
      {imports.map((item) => (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5" key={item.id || item.importedAt}>
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
          <Button
            aria-label={t("documents.deleteAppleImport", { name: item.sourceName })}
            onClick={() => {
              if (window.confirm(t("documents.deleteAppleImportConfirm"))) void controller.deleteAppleHealthImport(item.id || item.importedAt);
            }}
            size="icon-sm"
            type="button"
            variant="destructive"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
