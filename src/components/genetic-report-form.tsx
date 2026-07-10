import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  biologicalAgeInputFromForm,
  biologicalAgeSystems,
  type BiologicalAgeReport,
  type BiologicalAgeReportInput,
} from "../genetics-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { DatePicker } from "./ui/date-picker";

export function GeneticReportForm({
  controller,
  report,
  onCancel,
  onSaved,
}: {
  controller: DashboardController;
  report: BiologicalAgeReport | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const systemScores = new Map(report?.systemScores.map((score) => [score.systemKey, score.age]) || []);
  const profileAge = controller.userState.profile.age;

  return (
    <Card className="xl:sticky xl:top-4">
      <CardHeader>
        <CardTitle>{report ? t("genetics.editTitle") : t("genetics.addTitle")}</CardTitle>
        <CardDescription>{t("genetics.addDescription")}</CardDescription>
        <CardAction><Badge variant="outline">{t("genetics.localOnly")}</Badge></CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          let input: BiologicalAgeReportInput;
          try {
            input = biologicalAgeInputFromForm(new FormData(event.currentTarget));
          } catch (error) {
            toast.error(error instanceof Error ? error.message : String(error));
            return;
          }
          const request = report
            ? controller.updateBiologicalAgeReport({ id: report.id, ...input })
            : controller.addBiologicalAgeReport(input);
          void request.then((saved) => {
            if (saved) onSaved();
          });
        }}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="genetic-report-name">{t("genetics.reportName")}</FieldLabel>
              <Input
                id="genetic-report-name"
                name="reportName"
                defaultValue={report?.reportName || ""}
                placeholder={t("genetics.reportNamePlaceholder")}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="genetic-provider">{t("genetics.provider")}</FieldLabel>
                <Input
                  id="genetic-provider"
                  name="provider"
                  defaultValue={report?.provider || ""}
                  placeholder={t("genetics.providerPlaceholder")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="genetic-collected-at">{t("genetics.collectedAt")}</FieldLabel>
                <DatePicker id="genetic-collected-at" name="collectedAt" defaultValue={report?.collectedAt || ""} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <AgeInput
                id="genetic-chronological-age"
                label={t("genetics.chronologicalAge")}
                name="chronologicalAge"
                defaultValue={report?.chronologicalAge ?? profileAge ?? ""}
                required
              />
              <AgeInput
                id="genetic-overall-age"
                label={t("genetics.overallAge")}
                name="overallAge"
                defaultValue={report?.overallAge ?? ""}
                required
              />
              <Field>
                <FieldLabel htmlFor="genetic-percentile">{t("genetics.percentile")}</FieldLabel>
                <Input
                  id="genetic-percentile"
                  name="percentile"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  defaultValue={report?.percentile ?? ""}
                />
                <FieldDescription>{t("genetics.percentileDescription")}</FieldDescription>
              </Field>
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">{t("genetics.systemScores")}</p>
                <p className="text-xs text-muted-foreground">{t("genetics.systemScoresDescription")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {biologicalAgeSystems.map((system) => (
                  <AgeInput
                    id={`genetic-system-${system.key}`}
                    key={system.key}
                    label={system.label}
                    name={`system-${system.key}`}
                    defaultValue={systemScores.get(system.key) ?? ""}
                  />
                ))}
              </div>
            </div>
            <Field>
              <FieldLabel htmlFor="genetic-notes">{t("common.notes")}</FieldLabel>
              <Textarea
                id="genetic-notes"
                name="notes"
                defaultValue={report?.notes || ""}
                placeholder={t("genetics.notesPlaceholder")}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              {report ? <Button type="button" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button> : null}
              <Button type="submit">{report ? t("genetics.update") : t("genetics.save")}</Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function AgeInput({
  id,
  label,
  name,
  defaultValue,
  required = false,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue: number | string;
  required?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type="number"
        min="0"
        max="150"
        step="0.1"
        defaultValue={defaultValue}
        required={required}
      />
    </Field>
  );
}
