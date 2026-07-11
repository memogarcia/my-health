import { lazy, Suspense } from "react";
import { PageShell } from "@/app/page-shell";
import { FeatureRouter } from "@/app/router";
import { cn } from "@/lib/utils";
import { navItems, type NavKey } from "@/dashboard-model";
import { t } from "@/platform/i18n";
import type { DashboardController } from "@/use-dashboard-controller";
import { AddResultDropdown } from "@/components/add-result-dropdown";
import { BodyCanvas } from "@/components/body-canvas";
import { CompactPrompt } from "@/components/compact-prompt";
import { Icon, type IconName } from "@/components/icon";
import { JobCenter } from "@/components/job-center";
import { LibraryWorkspace } from "@/components/library-workspace";
import { OrganInspector } from "@/components/organ-inspector";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UnifiedTimeline } from "@/components/unified-timeline";

type WorkspaceKey = "overview" | "timeline" | "library" | "assistant" | "utility";

type RailItem = {
  icon: IconName;
  key: Exclude<WorkspaceKey, "utility">;
  label: string;
  nav: NavKey;
};

const IntakeDialog = lazy(() => import("@/components/intake-dialog").then((module) => ({ default: module.IntakeDialog })));

const railItems: RailItem[] = [
  { key: "overview", nav: "body", icon: "body", label: t("workspace.overview") },
  { key: "timeline", nav: "labs", icon: "activity", label: t("workspace.timeline") },
  { key: "library", nav: "documents", icon: "book-open", label: t("workspace.library") },
  { key: "assistant", nav: "plan", icon: "sparkles", label: t("workspace.assistant") },
];

const railButtonBase =
  "relative flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[0.8125rem] font-medium text-muted-ink transition-[background-color,color,transform] duration-[var(--dur-feedback)] hover:bg-secondary/70 hover:text-ink active:translate-y-px data-[selected=true]:bg-surface data-[selected=true]:text-ink data-[selected=true]:shadow-[var(--elev-1)] max-[1040px]:min-h-10 max-[1040px]:justify-center max-[1040px]:px-0";

export function HealthWorkspace({ controller }: { controller: DashboardController }) {
  const workspace = workspaceForNav(controller.selectedNav);
  const activeNav = navItems.find((item) => item.key === controller.selectedNav) || navItems[0];
  const workspaceLabel = railItems.find((item) => item.key === workspace)?.label || activeNav.label;
  const pageLabel = workspace === "utility" || controller.selectedNav === "activity" || (workspace === "library" && controller.selectedNav !== "documents")
    ? activeNav.label
    : workspaceLabel;

  return (
    <main className="grid h-full grid-cols-[248px_minmax(0,1fr)] bg-canvas text-ink max-[1040px]:grid-cols-[80px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col bg-canvas px-2 pb-2.5 max-[1040px]:items-center max-[1040px]:px-1.5" data-tauri-drag-region="deep">
        <div className="h-10 shrink-0" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={t("workspace.overview")}
              className="mb-3 flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[1.0625rem] font-semibold text-ink transition-colors duration-[var(--dur-feedback)] hover:bg-secondary/65 max-[1040px]:mb-4 max-[1040px]:min-h-10 max-[1040px]:justify-center max-[1040px]:px-0"
              onClick={() => controller.setSelectedNav("body")}
              type="button"
            >
              <span className="grid size-[26px] shrink-0 place-items-center rounded-[9px] bg-primary text-primary-foreground [corner-shape:superellipse(1.6)] shadow-[var(--elev-1)]">
                <Icon name="heart" size={15} />
              </span>
              <span className="max-[1040px]:hidden">{t("brand.name")}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>{t("workspace.overview")}</TooltipContent>
        </Tooltip>

        <nav aria-label={t("nav.primary")} className="grid w-full gap-1">
          {railItems.map((item) => (
            <RailButton
              badge={item.key === "timeline" ? controller.attentionMarkers : 0}
              icon={item.icon}
              key={item.key}
              label={item.label}
              onClick={() => controller.setSelectedNav(item.nav)}
              selected={workspace === item.key}
            />
          ))}
        </nav>

        <div className="flex-1" />
        <div className="grid w-full gap-1 border-t border-border/55 pt-2">
          <RailButton
            icon="settings"
            label={t("nav.settings.label")}
            onClick={() => controller.setSelectedNav("settings")}
            selected={controller.selectedNav === "settings"}
          />
          <RailButton
            icon="developer"
            label={t("nav.developer.label")}
            onClick={() => controller.setSelectedNav("developer")}
            selected={controller.selectedNav === "developer"}
          />
          <RailButton
            icon="lock"
            label={t("database.lock")}
            onClick={() => void controller.lockDatabase()}
            selected={false}
          />
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-canvas">
        <header className="flex min-h-14 items-center justify-between gap-5 bg-canvas px-7 max-[880px]:px-5" data-tauri-drag-region="deep">
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9375rem] font-semibold text-ink">{pageLabel}</strong>
          <div className="flex items-center gap-1.5">
            <JobCenter controller={controller} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label={t("appShell.dailyLog")}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-ink transition-colors duration-[var(--dur-feedback)] hover:bg-secondary hover:text-ink"
                  onClick={() => controller.setSelectedNav("activity")}
                  type="button"
                >
                  <Icon name="activity" size={17} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={7}>{t("appShell.dailyLog")}</TooltipContent>
            </Tooltip>
            <AddResultDropdown controller={controller} />
          </div>
        </header>

        {controller.loadError ? (
          <div className="flex items-center gap-2 border-y border-attention/25 bg-attention/8 px-7 py-2 text-sm text-attention" role="alert">
            <Icon name="symptom" />
            {controller.loadError}
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 bg-canvas">
          {workspace === "overview" ? (
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(510px,1fr)_minmax(330px,390px)] bg-canvas max-[1040px]:grid-cols-[minmax(420px,1fr)_316px] max-[880px]:grid-cols-[minmax(350px,1fr)_286px]">
              <BodyCanvas controller={controller} />
              <OrganInspector controller={controller} />
            </div>
          ) : null}
          {workspace === "timeline" ? (
            <PageShell fullBleed>
              {controller.selectedNav === "activity" ? <FeatureRouter controller={controller} /> : <UnifiedTimeline controller={controller} />}
            </PageShell>
          ) : null}
          {workspace === "library" ? (
            <PageShell fullBleed>
              <LibraryWorkspace controller={controller} />
            </PageShell>
          ) : null}
          {workspace === "assistant" ? (
            <PageShell fullBleed>
              <FeatureRouter controller={controller} />
            </PageShell>
          ) : null}
          {workspace === "utility" ? (
            <PageShell>
              <FeatureRouter controller={controller} />
            </PageShell>
          ) : null}
        </div>
        {workspace === "overview" || workspace === "timeline" || workspace === "library" ? <CompactPrompt controller={controller} /> : null}
      </section>
      {controller.activeDialog ? <Suspense fallback={null}><IntakeDialog controller={controller} /></Suspense> : null}
    </main>
  );
}

function RailButton({ badge = 0, icon, label, onClick, selected }: { badge?: number; icon: IconName; label: string; onClick: () => void; selected: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-current={selected ? "page" : undefined}
          aria-label={label}
          className={railButtonBase}
          data-selected={selected}
          onClick={onClick}
          type="button"
        >
          <Icon name={icon} size={17} />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-[1040px]:sr-only">{label}</span>
          {badge > 0 ? (
            <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full bg-attention/14 px-[5px] text-[10px] font-bold text-attention max-[1040px]:absolute max-[1040px]:right-[-4px] max-[1040px]:top-0">
              {badge}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}

function workspaceForNav(nav: NavKey): WorkspaceKey {
  if (nav === "body") return "overview";
  if (nav === "labs" || nav === "symptoms" || nav === "activity") return "timeline";
  if (["documents", "medications", "fasting", "breathing", "research"].includes(nav)) return "library";
  if (nav === "plan") return "assistant";
  return "utility";
}
