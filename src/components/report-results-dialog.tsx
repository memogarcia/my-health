import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "../dashboard-format";
import type { HealthStatus, LabReport, LabResult } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { followUpPriorityLabel } from "./lab-result-context";
import { EditLabDialog } from "./history/history-result-edit-dialog";
import { DatePicker } from "./ui/date-picker";

const unchanged = "unchanged";

export function ReportResultsDialog({ controller, report, onClose }: { controller: DashboardController; report: LabReport | null; onClose: () => void }) {
  const results = report ? controller.display.latestLabResults.filter((result) => result.reportId === report.id) : [];
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editing, setEditing] = useState<LabResult | null>(null);
  const [organKey, setOrganKey] = useState(unchanged);
  const [status, setStatus] = useState(unchanged);
  const [measuredAt, setMeasuredAt] = useState("");

  useEffect(() => {
    setSelectedIds(results.map((result) => result.id));
    setEditing(null);
    setOrganKey(unchanged);
    setStatus(unchanged);
    setMeasuredAt("");
  }, [report?.id]);

  const allSelected = results.length > 0 && selectedIds.length === results.length;
  const hasChanges = organKey !== unchanged || status !== unchanged || Boolean(measuredAt);

  function toggle(id: number, checked: boolean): void {
    setSelectedIds((current) => checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id));
  }

  function applyBulkUpdate(): void {
    if (!selectedIds.length || !hasChanges) return;
    void controller.updateLabResults({
      ids: selectedIds,
      ...(organKey === unchanged ? {} : { organKey }),
      ...(status === unchanged ? {} : { status: status as HealthStatus }),
      ...(measuredAt ? { measuredAt } : {}),
    });
  }

  return (
    <>
      <Dialog open={Boolean(report)} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("documents.reportResultsTitle")}</DialogTitle>
            <DialogDescription>{report ? t("documents.reportResultsDescription", { report: report.sourceName, count: results.length }) : ""}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="rounded-md border border-border bg-muted/35 p-3">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">{t("documents.bulkEdit")}</strong>
              <span className="text-xs text-muted-foreground">{t("documents.selectedResults", { count: selectedIds.length })}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t("documents.bulkOrgan")}</FieldLabel>
                <Select value={organKey} onValueChange={setOrganKey}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value={unchanged}>{t("documents.noChange")}</SelectItem>{controller.display.organs.map((organ) => <SelectItem key={organ.key} value={organ.key}>{organ.name}</SelectItem>)}</SelectGroup></SelectContent></Select>
              </Field>
              <Field>
                <FieldLabel>{t("documents.bulkStatus")}</FieldLabel>
                <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value={unchanged}>{t("documents.noChange")}</SelectItem><SelectItem value="normal">{followUpPriorityLabel("normal")}</SelectItem><SelectItem value="monitor">{followUpPriorityLabel("monitor")}</SelectItem><SelectItem value="attention">{followUpPriorityLabel("attention")}</SelectItem></SelectGroup></SelectContent></Select>
              </Field>
              <Field><FieldLabel>{t("documents.bulkDate")}</FieldLabel><DatePicker name="report-bulk-date" value={measuredAt} onChange={setMeasuredAt} /></Field>
            </div>
            <Button disabled={!selectedIds.length || !hasChanges} onClick={applyBulkUpdate} size="sm" type="button">{t("documents.applyBulk")}</Button>
          </FieldGroup>
          {results.length ? <Table>
            <TableHeader><TableRow><TableHead><Checkbox aria-label={t("documents.selectAllResults")} checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked ? results.map((result) => result.id) : [])} /></TableHead><TableHead>{t("history.table.marker")}</TableHead><TableHead>{t("history.table.result")}</TableHead><TableHead>{t("common.date")}</TableHead><TableHead>{t("lab.followUp.label")}</TableHead><TableHead>{t("common.actions")}</TableHead></TableRow></TableHeader>
            <TableBody>{results.map((result) => <TableRow key={result.id}><TableCell><Checkbox aria-label={t("documents.selectResult", { marker: result.marker })} checked={selectedIds.includes(result.id)} onCheckedChange={(checked) => toggle(result.id, checked === true)} /></TableCell><TableCell className="font-medium">{result.marker}</TableCell><TableCell className="tnum">{result.value} {result.unit}</TableCell><TableCell>{formatDate(result.measuredAt)}</TableCell><TableCell>{followUpPriorityLabel(result.status)}</TableCell><TableCell><Button aria-label={t("history.result.edit")} onClick={() => setEditing(result)} size="icon-sm" type="button" variant="ghost"><Pencil /></Button></TableCell></TableRow>)}</TableBody>
          </Table> : <p className="text-sm text-muted-foreground">{t("documents.noLinkedResults")}</p>}
          <DialogFooter><Button onClick={onClose} type="button" variant="ghost">{t("common.close")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <EditLabDialog controller={controller} lab={editing} onClose={() => setEditing(null)} />
    </>
  );
}
