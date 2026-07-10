import { statusLabel, type OrganSummary } from "../../dashboard-model";
import { t } from "../../i18n";
import type { DashboardController } from "../../use-dashboard-controller";
import type { VisualHealthStatus } from "../health-status";

export function organRecordCount(controller: DashboardController, organ: OrganSummary): number {
  const conditionCount = controller.display.conditions.filter((condition) => condition.organKey === organ.key).length;
  return organ.labCount + organ.symptomCount + conditionCount;
}

export function organVisualStatus(controller: DashboardController, organ: OrganSummary): VisualHealthStatus {
  return organRecordCount(controller, organ) > 0 ? organ.status : "empty";
}

export function visualStatusLabel(status: VisualHealthStatus): string {
  return status === "empty" ? t("status.noData") : statusLabel[status];
}
