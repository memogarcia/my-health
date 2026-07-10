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
    <div className="library-workspace">
      <aside className="library-index">
        <header><h1>{t("workspace.library")}</h1><p>{t("workspace.libraryHint")}</p></header>
        <nav aria-label={t("workspace.library")}>{sections.map((item) => (
          <button data-selected={item.nav === active.nav} key={item.nav} onClick={() => controller.setSelectedNav(item.nav)} type="button">
            <span><Icon name={item.icon as IconName} size={17} /></span>
            <span><strong>{item.title}</strong><small>{item.description}</small></span>
            <Icon name="chevron" size={13} />
          </button>
        ))}</nav>
      </aside>
      <section className="library-detail" aria-label={active.title}><FeatureRouter controller={controller} /></section>
    </div>
  );
}
