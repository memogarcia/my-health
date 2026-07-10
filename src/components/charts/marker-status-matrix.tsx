import { useId } from "react";
import type { LabResult, OrganSummary } from "../../dashboard-model";
import { formatDate } from "../../dashboard-format";
import { buildMarkerStatusMatrixData, type MarkerStatusMatrixRow } from "../../charts/marker-status-matrix-data";
import { t } from "../../i18n";
import { StatusDot } from "../health-status";
import { followUpPriorityLabel, labFlagLabel } from "../lab-result-context";

export function MarkerStatusMatrix({ labs, organs, onSelectSeries }: { labs: LabResult[]; organs: OrganSummary[]; onSelectSeries?: (seriesKey: string) => void }) {
  const generatedId = useId();
  const { dates, rows } = buildMarkerStatusMatrixData(labs);
  if (!dates.length || !rows.length) return null;
  const titleId = `status-matrix-title-${generatedId}`;
  const descriptionId = `status-matrix-description-${generatedId}`;
  return (
    <section className="status-matrix" aria-describedby={descriptionId} aria-labelledby={titleId}>
      <div className="status-matrix-header">
        <h3 className="text-sm font-semibold" id={titleId}>{t("charts.matrix.title")}</h3>
        <p className="text-xs text-muted-foreground" id={descriptionId}>{t("charts.matrix.description")}</p>
      </div>
      <div className="status-matrix-grid" style={{ display: "block" }}>
        <table aria-describedby={descriptionId} aria-labelledby={titleId} className="w-full table-fixed border-separate [border-spacing:0.35rem]">
          <colgroup>
            <col className="w-[30%]" />
            <col span={dates.length} />
          </colgroup>
          <thead>
            <tr>
              <th className="p-0" scope="col"><span className="sr-only">{t("history.table.marker")}</span></th>
              {dates.map((date, dateIndex) => (
                <th className="p-0 text-center font-normal" id={`${generatedId}-date-${dateIndex}`} key={date} scope="col">
                  <span className="status-matrix-date inline-block">{formatDate(date)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, markerIndex) => (
              <MatrixRow
                dates={dates}
                idPrefix={generatedId}
                key={row.key}
                row={row}
                markerIndex={markerIndex}
                organLabel={organName(row.organKey, organs)}
                onSelectSeries={onSelectSeries}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MatrixRow({
  dates,
  idPrefix,
  row,
  markerIndex,
  organLabel,
  onSelectSeries,
}: {
  dates: string[];
  idPrefix: string;
  row: MarkerStatusMatrixRow;
  markerIndex: number;
  organLabel: string;
  onSelectSeries?: (seriesKey: string) => void;
}) {
  const markerHeaderId = `${idPrefix}-marker-${markerIndex}`;
  const { marker } = row;
  return (
    <tr>
      <th className="p-0 text-left font-normal" id={markerHeaderId} scope="row">
        {onSelectSeries ? (
          <button className="status-matrix-marker w-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" onClick={() => onSelectSeries(row.seriesKey)}>{marker} · {organLabel}</button>
        ) : <>{marker} · {organLabel}</>}
      </th>
      {dates.map((date, dateIndex) => {
        const lab = row.labsByDate.get(date);
        const detailsId = `${idPrefix}-cell-${markerIndex}-${dateIndex}`;
        return (
          <td
            aria-labelledby={`${markerHeaderId} ${idPrefix}-date-${dateIndex} ${detailsId}`}
            className="p-0"
            key={date}
            title={lab ? t("charts.matrix.cellTitle", {
              marker: lab.marker,
              priority: followUpPriorityLabel(lab.status),
              range: labFlagLabel(lab.flag),
              unit: lab.unit,
              value: lab.value,
            }) : t("charts.matrix.noResult")}
          >
            <span className="status-matrix-cell w-full">
              {lab ? <StatusDot status={lab.status} /> : <span aria-hidden="true" className="status-empty-dot" />}
              <span className="sr-only" id={detailsId}>
                {lab ? <>
                  {lab.value} {lab.unit} {t("lab.flag.badge", { flag: labFlagLabel(lab.flag) })} {t("lab.followUp.badge", { priority: followUpPriorityLabel(lab.status) })}
                </> : t("charts.matrix.noResult")}
              </span>
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function organName(key: string, organs: OrganSummary[]): string {
  return organs.find((organ) => organ.key === key)?.name || key;
}
