import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AddResultDropdown } from "./add-result-dropdown";
import { LabAnalyticsPanel } from "./charts/lab-analytics-panel";
import { SymptomSeverityChart } from "./charts/symptom-severity-chart";
import { Plus } from "./health-icons";
import { filterLabs, filterSymptoms, organOptions, type LabView, type OrganFilter } from "./history/history-helpers";
import { HistorySummary } from "./history/history-summary";
import { OrganChips, SearchInput, ViewToggle } from "./history/history-toolbar";
import { LabTable, MarkerCards } from "./history/history-results";
import { SymptomTimeline } from "./history/history-symptoms";

type LabList = ReturnType<typeof filterLabs>;
type SymptomList = ReturnType<typeof filterSymptoms>;
type OrganOptionList = ReturnType<typeof organOptions>;

export function HistoryPage({ controller }: { controller: DashboardController }) {
  const [organFilter, setOrganFilter] = useState<OrganFilter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<LabView>("list");
  const page = controller.selectedNav === "symptoms" ? "symptoms" : "labs";

  // Each page is a fresh filter context: switching Results <-> Symptoms resets
  // the organ scope and query so stale filters never hide the new dataset.
  useEffect(() => {
    setOrganFilter("all");
    setSearch("");
  }, [page]);

  const labs = controller.display.latestLabResults;
  const symptoms = controller.display.recentSymptoms;
  const organs = controller.display.organs;

  const filteredLabs = useMemo(() => filterLabs(labs, organFilter, search), [labs, organFilter, search]);
  const filteredSymptoms = useMemo(() => filterSymptoms(symptoms, organFilter, search), [symptoms, organFilter, search]);
  const labOrganOptions = useMemo(() => organOptions(labs, organs), [labs, organs]);
  const symptomOrganOptions = useMemo(() => organOptions(symptoms, organs), [symptoms, organs]);

  function clearFilters(): void {
    setOrganFilter("all");
    setSearch("");
  }

  // Distinguish "still loading the snapshot" from "genuinely empty" so the
  // empty state never reads as missing data on first unlock.
  if (!controller.hasSnapshot && !controller.loadError) {
    return <HistoryLoading />;
  }

  if (page === "symptoms") {
    return (
      <SymptomsPage
        controller={controller}
        symptoms={filteredSymptoms}
        organs={organs}
        organOptions={symptomOrganOptions}
        organFilter={organFilter}
        search={search}
        hasUnfiltered={symptoms.length > 0}
        onClear={clearFilters}
        onOrganChange={setOrganFilter}
        onSearchChange={setSearch}
      />
    );
  }

  return (
    <ResultsPage
      controller={controller}
      labs={filteredLabs}
      allLabs={labs}
      symptoms={filteredSymptoms}
      organs={organs}
      organOptions={labOrganOptions}
      organFilter={organFilter}
      search={search}
      view={view}
      hasUnfiltered={labs.length > 0}
      onClear={clearFilters}
      onOrganChange={setOrganFilter}
      onSearchChange={setSearch}
      onViewChange={setView}
    />
  );
}

function ResultsPage({
  controller,
  labs,
  allLabs,
  symptoms,
  organs,
  organOptions,
  organFilter,
  search,
  view,
  hasUnfiltered,
  onClear,
  onOrganChange,
  onSearchChange,
  onViewChange,
}: {
  controller: DashboardController;
  labs: LabList;
  allLabs: LabList;
  symptoms: SymptomList;
  organs: DashboardController["display"]["organs"];
  organOptions: OrganOptionList;
  organFilter: OrganFilter;
  search: string;
  view: LabView;
  hasUnfiltered: boolean;
  onClear: () => void;
  onOrganChange: (value: OrganFilter) => void;
  onSearchChange: (value: string) => void;
  onViewChange: (value: LabView) => void;
}) {
  return (
    <div className="grid gap-4">
      <HistorySummary
        tab="labs"
        labs={labs}
        symptoms={symptoms}
        hasUnfilteredLabs={hasUnfiltered}
        hasUnfilteredSymptoms={symptoms.length > 0}
        onClear={onClear}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("history.results.title")}</CardTitle>
          <CardDescription>{t("history.results.description")}</CardDescription>
          <CardAction>
            <AddResultDropdown controller={controller} />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={onSearchChange} placeholder={t("history.results.search")} />
            <ViewToggle view={view} onChange={onViewChange} />
          </div>
          <OrganChips options={organOptions} value={organFilter} onChange={onOrganChange} />
          <LabAnalyticsPanel labs={labs} organs={organs} />
          {view === "grouped" ? (
            <MarkerCards labs={labs} organs={organs} hasUnfiltered={hasUnfiltered} onSelectOrgan={onOrganChange} onClear={onClear} />
          ) : (
            <LabTable controller={controller} labs={labs} allLabs={allLabs} hasUnfiltered={hasUnfiltered} onClear={onClear} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SymptomsPage({
  controller,
  symptoms,
  organs,
  organOptions,
  organFilter,
  search,
  hasUnfiltered,
  onClear,
  onOrganChange,
  onSearchChange,
}: {
  controller: DashboardController;
  symptoms: SymptomList;
  organs: DashboardController["display"]["organs"];
  organOptions: OrganOptionList;
  organFilter: OrganFilter;
  search: string;
  hasUnfiltered: boolean;
  onClear: () => void;
  onOrganChange: (value: OrganFilter) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <HistorySummary
        tab="symptoms"
        labs={[]}
        symptoms={symptoms}
        hasUnfilteredLabs={false}
        hasUnfilteredSymptoms={hasUnfiltered}
        onClear={onClear}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("history.symptoms.title")}</CardTitle>
          <CardDescription>{t("history.symptoms.description")}</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => controller.openDialog("symptom")}>
              <Plus /> {t("history.symptoms.add")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={onSearchChange} placeholder={t("history.symptoms.search")} />
          </div>
          <OrganChips options={organOptions} value={organFilter} onChange={onOrganChange} />
          <SymptomSeverityChart symptoms={symptoms} />
          <SymptomTimeline controller={controller} symptoms={symptoms} organs={organs} hasUnfiltered={hasUnfiltered} onSelectOrgan={onOrganChange} onClear={onClear} />
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryLoading() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <Skeleton className="h-28 w-full" key={index} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
