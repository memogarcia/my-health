import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { formatDate } from "../../dashboard-format";
import type { LabResult, OrganSummary } from "../../dashboard-model";
import { t } from "../../i18n";
import { groupByMarker, parseLabNumber, type LabSeries } from "../../sparkline";
import { FileText } from "../health-icons";
import { StatusBadge } from "../health-status";
import { SparklineView } from "../sparkline-view";
import { defaultLabSort, formatDelta, nextLabSort, organName, sortLabResults, type LabSort, type LabSortKey } from "./history-helpers";

export function MarkerCards({
  labs,
  organs,
  hasUnfiltered,
  onSelectOrgan,
  onClear,
}: {
  labs: LabResult[];
  organs: OrganSummary[];
  hasUnfiltered: boolean;
  onSelectOrgan: (key: string) => void;
  onClear: () => void;
}) {
  const series = useMemo(() => groupByMarker(labs), [labs]);
  if (series.length === 0) {
    return <NoResults hasUnfiltered={hasUnfiltered} onClear={onClear} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {series.map((item) => <MarkerCard key={item.marker} series={item} organs={organs} onSelectOrgan={onSelectOrgan} />)}
    </div>
  );
}

function MarkerCard({
  series,
  organs,
  onSelectOrgan,
}: {
  series: LabSeries;
  organs: OrganSummary[];
  onSelectOrgan: (key: string) => void;
}) {
  const latest = series.points[series.points.length - 1];
  const previous = series.points[series.points.length - 2];
  const organKey = latest.organKey;
  const organLabel = organName(organKey, organs);

  return (
    <Card size="sm">
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium">{series.marker}</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-5 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => onSelectOrgan(organKey)}
              title={t("history.card.filterTo", { organ: organLabel })}
            >
              {organLabel}<span className="ml-1 tnum">{series.points.length}</span>
            </Button>
          </div>
          <StatusBadge status={latest.status} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="text-2xl font-semibold">{latest.value}</span>
            {series.unit ? <span className="ml-1 text-sm text-muted-foreground">{series.unit}</span> : null}
            {latest.referenceRange ? <p className="mt-0.5 text-xs text-muted-foreground">{t("history.card.referenceRange", { range: latest.referenceRange })}</p> : null}
            <Delta latest={latest} previous={previous} />
          </div>
          <SparklineView series={series} className="mini-spark w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

function Delta({ latest, previous }: { latest: LabResult; previous?: LabResult }) {
  if (!previous) {
    return <p className="mt-1 text-xs text-muted-foreground">{t("history.card.firstReading", { date: formatDate(latest.measuredAt) })}</p>;
  }
  const a = parseLabNumber(latest.value);
  const b = parseLabNumber(previous.value);
  const sameDay = latest.measuredAt === previous.measuredAt;
  if (a == null || b == null || a === b) {
    return <p className="mt-1 text-xs text-muted-foreground">{t("history.card.fromDate", { date: formatDate(previous.measuredAt) })}</p>;
  }
  const diff = a - b;
  const up = diff > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3" aria-hidden="true" />
      <span className="tnum">{up ? "+" : ""}{formatDelta(diff)}</span>
      {sameDay ? null : <span>{t("history.card.fromDateInline", { date: formatDate(previous.measuredAt) })}</span>}
    </p>
  );
}

export function LabTable({
  labs,
  allLabs,
  hasUnfiltered,
  onClear,
}: {
  labs: LabResult[];
  allLabs: LabResult[];
  hasUnfiltered: boolean;
  onClear: () => void;
}) {
  const [sort, setSort] = useState<LabSort>(defaultLabSort);
  const byMarker = useMemo(() => {
    const map = new Map<string, LabSeries>();
    for (const item of groupByMarker(allLabs)) map.set(item.marker, item);
    return map;
  }, [allLabs]);

  // Show each marker's sparkline only on its most recent row so the list view
  // doesn't repeat the same series on every reading of that marker.
  const latestIdPerMarker = useMemo(() => {
    const latest = new Map<string, LabResult>();
    for (const lab of labs) {
      const current = latest.get(lab.marker);
      if (!current || lab.measuredAt > current.measuredAt || (lab.measuredAt === current.measuredAt && lab.id > current.id)) {
        latest.set(lab.marker, lab);
      }
    }
    return new Set([...latest.values()].map((lab) => lab.id));
  }, [labs]);
  const sorted = useMemo(() => sortLabResults(labs, sort), [labs, sort]);

  if (labs.length === 0) {
    return <NoResults hasUnfiltered={hasUnfiltered} onClear={onClear} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label={t("history.table.date")} column="measuredAt" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
          <SortableHead label={t("history.table.marker")} column="marker" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
          <SortableHead label={t("history.table.result")} column="value" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
          <SortableHead label={t("history.table.units")} column="unit" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
          <SortableHead label={t("history.table.refRange")} column="referenceRange" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
          <SortableHead label={t("common.status")} column="status" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
          <TableHead>{t("history.table.trend")}</TableHead>
          <SortableHead label={t("history.table.notes")} column="notes" sort={sort} onSort={(key) => setSort((current) => nextLabSort(current, key))} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((lab) => (
          <TableRow key={lab.id}>
            <TableCell className="whitespace-nowrap">{formatDate(lab.measuredAt)}</TableCell>
            <TableCell className="font-medium">{lab.marker}</TableCell>
            <TableCell className="tnum">{lab.value}</TableCell>
            <TableCell>{lab.unit || "-"}</TableCell>
            <TableCell className="tnum">{lab.referenceRange || "-"}</TableCell>
            <TableCell><StatusBadge status={lab.status} /></TableCell>
            <TableCell>
              {latestIdPerMarker.has(lab.id) && byMarker.has(lab.marker) ? (
                <SparklineView className="table-spark w-28" series={byMarker.get(lab.marker) as LabSeries} />
              ) : (
                <span className="text-muted-foreground">·</span>
              )}
            </TableCell>
            <TableCell className="max-w-60 truncate" title={lab.notes || undefined}>{lab.notes || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortableHead({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: LabSortKey;
  sort: LabSort;
  onSort: (key: LabSortKey) => void;
}) {
  const active = sort.key === column;
  const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TableHead aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-foreground" onClick={() => onSort(column)}>
        {label}
        <Icon className={active ? "text-foreground" : "text-muted-foreground"} aria-hidden="true" />
      </Button>
    </TableHead>
  );
}

export function NoResults({ hasUnfiltered, onClear }: { hasUnfiltered: boolean; onClear: () => void }) {
  return (
    <Empty className="min-h-72">
      <EmptyMedia variant="icon"><FileText /></EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{hasUnfiltered ? t("history.empty.noResultsMatch") : t("history.empty.noResultsYet")}</EmptyTitle>
        <EmptyDescription>
          {hasUnfiltered ? t("history.empty.clearResults") : t("history.empty.addResult")}
        </EmptyDescription>
        {hasUnfiltered ? (
          <Button variant="outline" size="sm" className="mt-1" onClick={onClear}>{t("common.clearFilter")}</Button>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}
