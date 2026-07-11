import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { FeatureRouter } from "./feature-router";
import { Icon, type IconName } from "./icon";

const sections = [
  { nav: "documents", icon: "document", title: t("workspace.library.documents"), description: t("workspace.library.documentsHint") },
  { nav: "medications", icon: "medication", title: t("workspace.library.regimen"), description: t("workspace.library.regimenHint") },
  { nav: "fasting", icon: "activity", title: t("workspace.library.fasting"), description: t("workspace.library.fastingHint") },
  { nav: "breathing", icon: "activity", title: t("workspace.library.breathing"), description: t("workspace.library.breathingHint") },
  { nav: "research", icon: "sparkles", title: t("workspace.library.research"), description: t("workspace.library.researchHint") },
] as const;

export function LibraryWorkspace({ controller }: { controller: DashboardController }) {
  const active = sections.find((item) => item.nav === controller.selectedNav) || sections[0];
  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[228px_minmax(0,1fr)] bg-surface max-[1040px]:grid-cols-[200px_minmax(0,1fr)] max-[880px]:grid-cols-[174px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-border bg-sidebar">
        <header className="px-5 py-6 max-[880px]:px-4">
          <h1 className="text-lg tracking-[-0.02em]">{t("workspace.library")}</h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-ink">{t("workspace.libraryHint")}</p>
        </header>
        <nav aria-label={t("workspace.library")} className="grid gap-0.5 px-2">
          {sections.map((item) => (
            <button
              className="grid w-full min-h-[56px] grid-cols-[30px_minmax(0,1fr)_13px] items-center gap-2 rounded-lg p-2 text-left text-ink transition-colors hover:bg-surface data-[selected=true]:bg-surface data-[selected=true]:shadow-[0_1px_2px_oklch(0.2_0.03_310/0.06)] max-[880px]:grid-cols-[28px_minmax(0,1fr)]"
              data-selected={item.nav === active.nav}
              key={item.nav}
              onClick={() => controller.setSelectedNav(item.nav)}
              type="button"
            >
              <span className="grid size-[29px] place-items-center rounded-sm bg-accent text-accent-ink"><Icon name={item.icon as IconName} size={17} /></span>
              <span className="grid min-w-0 gap-0.5">
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">{item.title}</strong>
                <small className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-ink">{item.description}</small>
              </span>
              <Icon name="chevron" size={13} />
            </button>
          ))}
        </nav>
      </aside>
      <section aria-label={active.title} className="min-h-0 min-w-0 overflow-y-auto bg-surface px-7 py-6 max-[880px]:px-5 [&>*]:mx-auto [&>*]:max-w-[1040px]">
        <FeatureRouter controller={controller} />
      </section>
    </div>
  );
}
