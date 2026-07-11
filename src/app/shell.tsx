import { lazy, Suspense } from "react";
import { PageShell } from "@/app/page-shell";
import { FeatureRouter } from "@/app/router";
import { cn } from "@/lib/utils";
import { navItems, type NavKey } from "@/dashboard-model";
import { t } from "@/platform/i18n";
import type { DashboardController } from "@/use-dashboard-controller";
import { BodyCanvas } from "@/components/body-canvas";
import { AddResultDropdown } from "@/components/add-result-dropdown";
import { CompactPrompt } from "@/components/compact-prompt";
import { Icon, type IconName } from "@/components/icon";
import { JobCenter } from "@/components/job-center";
import { LibraryWorkspace } from "@/components/library-workspace";
import { OrganInspector } from "@/components/organ-inspector";
import { UnifiedTimeline } from "@/components/unified-timeline";

type WorkspaceKey = "overview" | "timeline" | "library" | "assistant" | "utility" | "regimen" | "fasting" | "breathing";

const IntakeDialog = lazy(() => import("@/components/intake-dialog").then((module) => ({ default: module.IntakeDialog })));

/** The primary workspaces shown in the sidebar rail. Derived from NavKey. */
const railItems: Array<{ key: WorkspaceKey; nav: NavKey; icon: IconName; label: string }> = [
  { key: "overview", nav: "body", icon: "body", label: t("workspace.overview") },
  { key: "timeline", nav: "labs", icon: "activity", label: t("workspace.timeline") },
  { key: "regimen", nav: "medications", icon: "medication", label: t("workspace.library.regimen") },
  { key: "fasting", nav: "fasting", icon: "activity", label: t("workspace.library.fasting") },
  { key: "breathing", nav: "breathing", icon: "activity", label: t("workspace.library.breathing") },
  { key: "library", nav: "documents", icon: "document", label: t("workspace.library") },
  { key: "assistant", nav: "plan", icon: "sparkles", label: t("workspace.assistant") },
];

const railButtonBase =
  "flex w-full min-h-9 items-center gap-2.5 rounded-sm px-2.5 text-left text-[0.8125rem] font-medium text-muted-ink transition-colors hover:bg-secondary/70 hover:text-ink data-[selected=true]:bg-secondary data-[selected=true]:text-ink max-[1040px]:min-h-9.5 max-[1040px]:justify-center max-[1040px]:px-0";

export function HealthWorkspace({ controller }: { controller: DashboardController }) {
  const workspace = workspaceForNav(controller.selectedNav);
  const activeNav = navItems.find((item) => item.key === controller.selectedNav) || navItems[0];
  const pageLabel =
    workspace === "utility" || controller.selectedNav === "activity"
      ? activeNav.label
      : railItems.find((item) => item.key === workspace)?.label || activeNav.label;

  return (
    <main className="grid h-full grid-cols-[248px_minmax(0,1fr)] bg-canvas text-ink max-[1040px]:grid-cols-[80px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col bg-canvas px-2 pb-2.5 max-[1040px]:items-center max-[1040px]:px-1.5" data-tauri-drag-region="deep">
        <div className="h-10 shrink-0" />
        <button
          aria-label={t("workspace.overview")}
          className="flex w-full min-h-[42px] items-center gap-2.5 rounded-sm px-2.5 text-left text-[1.0625rem] font-semibold text-ink transition-colors hover:bg-secondary/70 max-[1040px]:mb-3.5 max-[1040px]:min-h-9.5 max-[1040px]:justify-center max-[1040px]:px-0"
          onClick={() => controller.setSelectedNav("body")}
          title={t("brand.name")}
          type="button"
        >
          <span className="grid size-[25px] shrink-0 place-items-center rounded-sm bg-accent text-accent-ink">
            <Icon name="heart" size={16} />
          </span>
          <span className="max-[1040px]:hidden">{t("brand.name")}</span>
        </button>
        <nav aria-label={t("nav.primary")} className="grid gap-0.5">
          {railItems.map((item) => (
            <button
              aria-label={item.label}
              className={railButtonBase}
              data-selected={workspace === item.key}
              key={item.key}
              onClick={() => controller.setSelectedNav(item.nav)}
              title={item.label}
              type="button"
            >
              <Icon name={item.icon} size={17} />
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-[1040px]:sr-only">
                {item.label}
              </span>
              {item.key === "timeline" && controller.attentionMarkers ? (
                <span className="relative grid ml-auto h-[18px] min-w-[18px] place-items-center rounded-full bg-[color-mix(in_oklch,var(--attention)_42%,var(--surface-soft))] px-[5px] text-[10px] font-bold text-ink max-[1040px]:absolute max-[1040px]:right-[-5px] max-[1040px]:top-0 max-[1040px]:h-[15px] max-[1040px]:min-w-[15px] max-[1040px]:px-[3px] max-[1040px]:text-[9px]">
                  {controller.attentionMarkers}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <button
          aria-label={t("nav.settings.label")}
          className={cn(railButtonBase, "max-[1040px]:mb-1")}
          data-selected={controller.selectedNav === "settings"}
          onClick={() => controller.setSelectedNav("settings")}
          title={t("nav.settings.label")}
          type="button"
        >
          <Icon name="settings" size={17} />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-[1040px]:sr-only">{t("nav.settings.label")}</span>
        </button>
        <button
          aria-label={t("nav.developer.label")}
          className={cn(railButtonBase, "mb-1")}
          data-selected={controller.selectedNav === "developer"}
          onClick={() => controller.setSelectedNav("developer")}
          title={t("nav.developer.label")}
          type="button"
        >
          <Icon name="developer" size={17} />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-[1040px]:sr-only">{t("nav.developer.label")}</span>
        </button>
        <button
          aria-label={t("database.lock")}
          className="flex w-full min-h-9 items-center justify-center gap-2 rounded-sm px-2.5 text-left text-[0.75rem] font-medium text-quiet transition-colors hover:bg-secondary/70 hover:text-ink max-[1040px]:px-0"
          onClick={() => void controller.lockDatabase()}
          title={t("database.lock")}
          type="button"
        >
          <Icon name="lock" size={14} />
          <span className="max-[1040px]:sr-only">{t("database.lock")}</span>
        </button>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-canvas">
        <header className="flex min-h-14 items-center justify-between gap-5 bg-canvas px-7 max-[880px]:px-5" data-tauri-drag-region="deep">
          <div className="flex min-w-0 items-baseline gap-2 text-sm text-quiet">
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9375rem] font-semibold text-ink">{pageLabel}</strong>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{t("brand.name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <JobCenter controller={controller} />
            <button
              aria-label={t("appShell.dailyLog")}
              className="inline-flex size-8 items-center justify-center rounded-sm text-ink transition-colors hover:bg-secondary"
              onClick={() => controller.setSelectedNav("activity")}
              title={t("appShell.dailyLog")}
              type="button"
            >
              <Icon name="activity" size={17} />
            </button>
            <AddResultDropdown controller={controller} />
          </div>
        </header>

        {controller.loadError ? (
          <div className="flex items-center gap-2 bg-[color-mix(in_srgb,var(--attention)_10%,var(--surface))] px-7 py-2 text-sm text-attention" role="alert">
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
          {workspace === "assistant" || workspace === "utility" || workspace === "regimen" || workspace === "fasting" || workspace === "breathing" ? (
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

function workspaceForNav(nav: NavKey): WorkspaceKey {
  if (nav === "body") return "overview";
  if (nav === "labs" || nav === "symptoms" || nav === "activity") return "timeline";
  if (nav === "medications") return "regimen";
  if (nav === "fasting") return "fasting";
  if (nav === "breathing") return "breathing";
  if (["documents", "research"].includes(nav)) return "library";
  if (nav === "plan") return "assistant";
  return "utility";
}
