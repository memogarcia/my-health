import { useEffect, useRef } from "react";
import { Toaster } from "sonner";
import DatabaseGate from "@/modules/platform-pages/pages/database-gate";
import { HealthWorkspace } from "@/app/shell";
import { Icon } from "@/components/icon";
import type { NavKey } from "@/dashboard-model";
import { bindDocumentDrop } from "@/document-intake";
import { configureNativeDatabaseMenu, configureNativeShell } from "@/platform/native-shell";
import { t } from "@/platform/i18n";
import { TAURI_ONLY_MESSAGE } from "@/platform/runtime";
import { useDashboardController } from "@/use-dashboard-controller";
import "@/styles/tailwind.css";
import "@/styles/foundations.css";
import "@/styles/app.css";
import "@/fasting.css";
import "@/breathing.css";

export function App() {
  const controller = useDashboardController();
  const controllerRef = useRef(controller);

  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  useEffect(() => {
    document.title = t("app.title");
    configureNativeShell();
    void configureNativeDatabaseMenu({
      lockDatabase: () => controllerRef.current.lockDatabase(),
      openDatabase: () => controllerRef.current.openDatabaseFile(),
      newDatabase: () => controllerRef.current.newDatabaseFile(),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (controller.databaseStatus && !controller.databaseStatus.unlocked) return;
    return bindDocumentDrop(window, controller.prepareDocumentResult);
  }, [controller.databaseStatus, controller.prepareDocumentResult]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if (event.key === "Escape" && controller.activeDialog) {
        event.preventDefault();
        controller.closeDialog();
        return;
      }
      const isMac = document.documentElement.dataset.platform === "macos";
      if (!(isMac ? event.metaKey : event.ctrlKey) || event.altKey) return;
      const workspaceShortcuts: NavKey[] = ["body", "labs", "documents", "plan"];
      const nav = /^\d$/u.test(event.key) ? workspaceShortcuts[Number(event.key) - 1] : undefined;
      if (event.key.toLowerCase() === "l" && !event.shiftKey) {
        event.preventDefault();
        void controller.lockDatabase();
      } else if (event.key === ",") {
        event.preventDefault();
        controller.setSelectedNav("settings");
      } else if (event.key.toLowerCase() === "n" && !event.shiftKey) {
        event.preventDefault();
        controller.openDialog("lab");
      } else if (nav) {
        event.preventDefault();
        controller.setSelectedNav(nav);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [controller.activeDialog, controller.closeDialog, controller.lockDatabase, controller.openDialog, controller.setSelectedNav]);

  if (!controller.hasLoadedOnce) return <LoadingScreen />;
  if (controller.tauriUnavailable) return <DesktopOnlyScreen error={controller.loadError || TAURI_ONLY_MESSAGE} />;
  if (controller.databaseStatus && !controller.databaseStatus.unlocked) {
    return <><DatabaseGate controller={controller} /><Toaster position="top-center" richColors /></>;
  }

  return <><HealthWorkspace controller={controller} /><Toaster position="top-center" richColors /></>;
}

function LoadingScreen() {
  return (
    <main className="grid min-h-full place-items-center content-center gap-[18px] bg-canvas" aria-label={t("app.loading")}>
      <span className="grid size-[34px] place-items-center rounded-[11px] bg-primary text-white [corner-shape:superellipse(1.6)] shadow-[0_2px_5px_oklch(0.2_0.08_350/0.2)]"><Icon name="heart" /></span>
      <span className="relative h-[3px] w-16 overflow-hidden rounded-full bg-secondary">
        <span className="absolute left-0 top-0 h-full w-[45%] animate-[loading_1s_var(--ease-out)_infinite_alternate] rounded-full bg-primary" />
      </span>
    </main>
  );
}

function DesktopOnlyScreen({ error }: { error: string }) {
  return (
    <main className="grid min-h-full place-items-center bg-canvas">
      <section className="max-w-[520px] rounded-[14px] bg-surface p-8 [corner-shape:superellipse(1.6)] shadow-[var(--shadow-float)]">
        <span className="grid size-[34px] place-items-center rounded-[11px] bg-primary text-white [corner-shape:superellipse(1.6)] shadow-[0_2px_5px_oklch(0.2_0.08_350/0.2)]"><Icon name="lock" /></span>
        <h1 className="mb-2 mt-5 text-2xl">{t("desktop.requiredTitle")}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-ink">{error}</p>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-ink">{t("desktop.requiredBody")} <code>bun run tauri:dev</code>. {t("desktop.requiredTail")}</p>
      </section>
    </main>
  );
}
