import { lazy, Suspense } from "react";
import { navItems, type NavKey } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { BodyCanvas } from "./body-canvas";
import { CompactPrompt } from "./compact-prompt";
import { FeatureRouter } from "./feature-router";
import { Icon, type IconName } from "./icon";
import { JobCenter } from "./job-center";
import { LibraryWorkspace } from "./library-workspace";
import { OrganInspector } from "./organ-inspector";
import { UnifiedTimeline } from "./unified-timeline";

type WorkspaceKey = "overview" | "timeline" | "library" | "assistant" | "utility";

const IntakeDialog = lazy(() => import("./intake-dialog").then((module) => ({ default: module.IntakeDialog })));
const railItems: Array<{ key: WorkspaceKey; nav: NavKey; icon: IconName; label: string }> = [
  { key: "overview", nav: "body", icon: "body", label: t("workspace.overview") },
  { key: "timeline", nav: "labs", icon: "activity", label: t("workspace.timeline") },
  { key: "library", nav: "documents", icon: "document", label: t("workspace.library") },
  { key: "assistant", nav: "plan", icon: "sparkles", label: t("workspace.assistant") },
];

export function HealthWorkspace({ controller }: { controller: DashboardController }) {
  const workspace = workspaceForNav(controller.selectedNav);
  const activeNav = navItems.find((item) => item.key === controller.selectedNav) || navItems[0];
  const pageLabel = workspace === "utility" ? activeNav.label : railItems.find((item) => item.key === workspace)?.label || activeNav.label;

  return (
    <main className="app-window">
      <aside className="app-rail" data-tauri-drag-region>
        <div className="traffic-space" />
        <button aria-label={t("workspace.overview")} className="rail-brand" onClick={() => controller.setSelectedNav("body")} title={t("brand.name")} type="button">
          <Icon name="heart" size={17} />
        </button>
        <nav aria-label={t("nav.primary")} className="rail-nav">
          {railItems.map((item) => (
            <button aria-label={item.label} data-selected={workspace === item.key} key={item.key} onClick={() => controller.setSelectedNav(item.nav)} title={item.label} type="button">
              <Icon name={item.icon} size={19} />
              {item.key === "timeline" && controller.attentionMarkers ? <span>{controller.attentionMarkers}</span> : null}
            </button>
          ))}
        </nav>
        <div className="rail-spacer" />
        <button aria-label={t("nav.settings.label")} className="rail-utility" data-selected={controller.selectedNav === "settings"} onClick={() => controller.setSelectedNav("settings")} title={t("nav.settings.label")} type="button"><Icon name="settings" size={18} /></button>
        <button aria-label={t("nav.developer.label")} className="rail-utility" data-selected={controller.selectedNav === "developer"} onClick={() => controller.setSelectedNav("developer")} title={t("nav.developer.label")} type="button"><Icon name="developer" size={18} /></button>
        <span aria-label={t("database.localRecords")} className="rail-lock" title={t("database.localRecords")}><Icon name="lock" size={12} /></span>
      </aside>

      <section className="workbench">
        <header className="workbench-bar" data-tauri-drag-region>
          <div className="workbench-title"><span>{t("brand.name")}</span><Icon name="chevron" size={12} /><strong>{pageLabel}</strong></div>
          <div className="workbench-actions">
            <JobCenter controller={controller} />
            <button aria-label={t("appShell.dailyLog")} className="toolbar-button" onClick={() => controller.openDialog("activity")} title={t("appShell.dailyLog")} type="button"><Icon name="activity" size={17} /></button>
            <button className="toolbar-primary" onClick={() => controller.openDialog("lab")} type="button"><Icon name="plus" size={16} />{t("workspace.addRecord")}</button>
          </div>
        </header>

        {controller.loadError ? <div className="load-error" role="alert"><Icon name="symptom" />{controller.loadError}</div> : null}
        <div className="workspace-stage">
          {workspace === "overview" ? <div className="overview-workspace"><BodyCanvas controller={controller} /><OrganInspector controller={controller} /></div> : null}
          {workspace === "timeline" ? <UnifiedTimeline controller={controller} /> : null}
          {workspace === "library" ? <LibraryWorkspace controller={controller} /> : null}
          {workspace === "assistant" || workspace === "utility" ? <div className="feature-viewport"><FeatureRouter controller={controller} /></div> : null}
        </div>
        {workspace === "overview" || workspace === "timeline" || workspace === "library" ? <CompactPrompt controller={controller} /> : null}
      </section>
      {controller.activeDialog ? <Suspense fallback={null}><IntakeDialog controller={controller} /></Suspense> : null}
    </main>
  );
}

function workspaceForNav(nav: NavKey): WorkspaceKey {
  if (nav === "body") return "overview";
  if (nav === "labs" || nav === "symptoms") return "timeline";
  if (["documents", "medications", "fasting", "breathing", "research"].includes(nav)) return "library";
  if (nav === "plan") return "assistant";
  return "utility";
}
