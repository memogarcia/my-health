import { useEffect, useMemo, useState } from "react";
import type { LabResult, OrganSummary } from "../../dashboard-model";
import { buildNumericLabSeries, pickDefaultLabSeries } from "../../charts/lab-series";
import { t } from "../../i18n";
import { ChartEmpty } from "./chart-empty";
import { ChartFrame } from "./chart-frame";
import { LabTrendChart } from "./lab-trend-chart";
import { MarkerStatusMatrix } from "./marker-status-matrix";

export function LabAnalyticsPanel({ labs, allLabs, organs }: { labs: LabResult[]; allLabs: LabResult[]; organs: OrganSummary[] }) {
  const filteredSeries = useMemo(() => buildNumericLabSeries(labs), [labs]);
  const allSeries = useMemo(() => buildNumericLabSeries(allLabs), [allLabs]);
  const series = filteredSeries.length ? filteredSeries : allSeries;
  const defaultSeries = pickDefaultLabSeries(series);
  const [selectedKey, setSelectedKey] = useState(defaultSeries?.key || "");
  useEffect(() => {
    if (!series.some((item) => item.key === selectedKey)) setSelectedKey(defaultSeries?.key || "");
  }, [defaultSeries?.key, selectedKey, series]);
  const selected = series.find((item) => item.key === selectedKey) || defaultSeries;
  const markerSelector = series.length > 1 ? (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {t("charts.lab.markerLabel")}
      <select className="chart-select" value={selected?.key || ""} onChange={(event) => setSelectedKey(event.target.value)}>
        {series.map((item) => <option key={item.key} value={item.key}>{item.marker} · {organName(item.organKey, organs)}</option>)}
      </select>
    </label>
  ) : null;
  return (
    <ChartFrame title={t("charts.lab.title")} description={t("charts.lab.description")} actions={markerSelector}>
      {selected ? (
        <div className="grid gap-4">
          <LabTrendChart series={selected} />
          <MarkerStatusMatrix labs={labs} onSelectMarker={(marker) => setSelectedKey(series.find((item) => item.marker === marker)?.key || selected.key)} />
        </div>
      ) : <ChartEmpty title={t("charts.lab.noNumeric")} description={t("charts.lab.noNumericDescription")} />}
    </ChartFrame>
  );
}

function organName(key: string, organs: OrganSummary[]): string {
  return organs.find((organ) => organ.key === key)?.name || key;
}
