import type { LabResult } from "../../dashboard-model";
import { formatDate } from "../../dashboard-format";
import { t } from "../../i18n";
import { StatusDot } from "../health-status";

export function MarkerStatusMatrix({ labs, onSelectMarker }: { labs: LabResult[]; onSelectMarker?: (marker: string) => void }) {
  const dates = [...new Set(labs.map((lab) => lab.measuredAt))].sort().slice(-8);
  const markers = [...new Set(labs.map((lab) => lab.marker))].sort((a, b) => a.localeCompare(b)).slice(0, 12);
  if (!dates.length || !markers.length) return null;
  return (
    <section className="status-matrix" aria-label={t("charts.matrix.title")}>
      <div className="status-matrix-header">
        <h3 className="text-sm font-semibold">{t("charts.matrix.title")}</h3>
        <p className="text-xs text-muted-foreground">{t("charts.matrix.description")}</p>
      </div>
      <div className="status-matrix-grid" style={{ gridTemplateColumns: `minmax(8rem, 1fr) repeat(${dates.length}, minmax(2.2rem, 0.4fr))` }}>
        <span />
        {dates.map((date) => <span className="status-matrix-date" key={date}>{formatDate(date)}</span>)}
        {markers.map((marker) => (
          <MatrixRow dates={dates} key={marker} labs={labs} marker={marker} onSelectMarker={onSelectMarker} />
        ))}
      </div>
    </section>
  );
}

function MatrixRow({ dates, labs, marker, onSelectMarker }: { dates: string[]; labs: LabResult[]; marker: string; onSelectMarker?: (marker: string) => void }) {
  return (
    <>
      <button className="status-matrix-marker" type="button" onClick={() => onSelectMarker?.(marker)}>{marker}</button>
      {dates.map((date) => {
        const lab = labs.find((item) => item.marker === marker && item.measuredAt === date);
        return <span className="status-matrix-cell" key={date} title={lab ? t("charts.matrix.cellTitle", { marker: lab.marker, value: lab.value, unit: lab.unit }) : t("charts.matrix.noResult")}>{lab ? <StatusDot status={lab.status} /> : <span className="status-empty-dot" />}</span>;
      })}
    </>
  );
}
