import { FeatureRouter } from "@/app/router";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon, type IconName } from "./icon";

const sections = [
  { nav: "documents", icon: "document", title: t("workspace.library.documents"), description: t("workspace.library.documentsHint") },
  { nav: "medications", icon: "medication", title: t("workspace.library.regimen"), description: t("workspace.library.regimenHint") },
  { nav: "fasting", icon: "timer", title: t("workspace.library.fasting"), description: t("workspace.library.fastingHint") },
  { nav: "breathing", icon: "wind", title: t("workspace.library.breathing"), description: t("workspace.library.breathingHint") },
  { nav: "research", icon: "sparkles", title: t("workspace.library.research"), description: t("workspace.library.researchHint") },
] as const;

export function LibraryWorkspace({ controller }: { controller: DashboardController }) {
  const active = sections.find((item) => item.nav === controller.selectedNav) || sections[0];
  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[228px_minmax(0,1fr)] bg-canvas max-[1040px]:grid-cols-[200px_minmax(0,1fr)] max-[880px]:grid-cols-[174px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-border/70 bg-canvas">
        <header className="px-5 pb-4 pt-6 max-[880px]:px-4">
          <h1 className="text-base font-semibold tracking-[-0.015em] text-ink">{t("workspace.library")}</h1>
        </header>
        <nav aria-label={t("workspace.library")} className="grid gap-1 px-2 pb-4">
          {sections.map((item) => (
            <button
              aria-current={item.nav === active.nav ? "page" : undefined}
              className="group grid min-h-[48px] w-full grid-cols-[30px_minmax(0,1fr)_13px] items-center gap-2 rounded-lg p-2 text-left text-muted-ink transition-[background-color,color,box-shadow] duration-[var(--dur-feedback)] hover:bg-secondary/65 hover:text-ink data-[selected=true]:bg-surface data-[selected=true]:text-ink data-[selected=true]:shadow-[var(--elev-1)] max-[880px]:grid-cols-[28px_minmax(0,1fr)]"
              data-selected={item.nav === active.nav}
              key={item.nav}
              onClick={() => controller.setSelectedNav(item.nav)}
              type="button"
            >
              <span className="grid size-[29px] place-items-center rounded-lg bg-secondary text-muted-ink transition-colors group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground">
                <Icon name={item.icon as IconName} size={16} />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-semibold">{item.title}</strong>
                <small className="max-h-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.6875rem] text-muted-ink opacity-0 transition-[max-height,opacity] duration-[var(--dur-state)] group-hover:max-h-4 group-hover:opacity-100 group-focus-visible:max-h-4 group-focus-visible:opacity-100 group-data-[selected=true]:max-h-4 group-data-[selected=true]:opacity-100">
                  {item.description}
                </small>
              </span>
              <Icon name="chevron" size={13} />
            </button>
          ))}
        </nav>
      </aside>
      <section aria-label={active.title} className="min-h-0 min-w-0 overflow-y-auto bg-canvas px-7 py-6 max-[880px]:px-5">
        <FeatureRouter controller={controller} />
      </section>
    </div>
  );
}
