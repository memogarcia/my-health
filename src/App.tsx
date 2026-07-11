import { useEffect, useRef } from "react";
import { Toaster } from "sonner";
import { DatabaseGate } from "./components/database-gate";
import { HealthWorkspace } from "./components/health-workspace";
import { Icon } from "./components/icon";
import type { NavKey } from "./dashboard-model";
import { bindDocumentDrop } from "./document-intake";
import { t } from "./i18n";
import { configureNativeDatabaseMenu, configureNativeShell } from "./native-shell";
import { useDashboardController } from "./use-dashboard-controller";
import "./styles/tailwind.css";
import "./animations.css";
import "./components.css";
import "./redesign.css";
import "./fasting.css";
import "./breathing.css";
import "./styles/foundations.css";
import "./styles/workspace.css";

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
  if (controller.tauriUnavailable) return <DesktopOnlyScreen error={controller.loadError} />;
  if (controller.databaseStatus && !controller.databaseStatus.unlocked) {
    return <><DatabaseGate controller={controller} /><Toaster position="top-center" richColors /></>;
  }

  return <><HealthWorkspace controller={controller} /><Toaster position="top-center" richColors /></>;
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label={t("app.loading")}>
      <span className="brand-mark"><Icon name="heart" /></span>
      <span className="loading-line" />
    </main>
  );
}

function DesktopOnlyScreen({ error }: { error: string }) {
  return (
    <main className="centered-screen">
      <section className="message-card squircle">
        <span className="brand-mark"><Icon name="lock" /></span>
        <h1>{t("desktop.requiredTitle")}</h1>
        <p>{error}</p>
        <p>{t("desktop.requiredBody")} <code>bun run tauri:dev</code>. {t("desktop.requiredTail")}</p>
      </section>
    </main>
  );
}
