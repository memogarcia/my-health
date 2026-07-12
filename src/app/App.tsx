import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import DatabaseGate from "@/modules/platform-pages/pages/database-gate";
import { HealthWorkspace } from "@/app/shell";
import { Icon } from "@/components/icon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bindDocumentDrop } from "@/document-intake";
import { configureNativeDatabaseMenu, configureNativeShell } from "@/platform/native-shell";
import { t } from "@/platform/i18n";
import { TAURI_ONLY_MESSAGE } from "@/platform/runtime";
import { applyResolvedTheme, resolveTheme } from "@/theme";
import { useDashboardController } from "@/use-dashboard-controller";
import { matchesShortcut } from "@/shortcuts";
import "@/styles/tailwind.css";
import "@/styles/foundations.css";
import "@/styles/app.css";
import "@/breathing.css";

export function App() {
  const controller = useDashboardController();
  const controllerRef = useRef(controller);
  const [colorScheme, setColorScheme] = useState<"light" | "dark">(() => resolveTheme(controller.userState.profile?.theme, {
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    prefersContrast: window.matchMedia("(prefers-contrast: more)").matches,
    forcedColors: window.matchMedia("(forced-colors: active)").matches,
  }).colorScheme);

  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  useEffect(() => {
    document.title = t("app.title");
    configureNativeShell();
    void configureNativeDatabaseMenu({
      lockDatabase: () => controllerRef.current.lockDatabase(),
      closeDatabase: () => controllerRef.current.closeDatabase(),
      openDatabase: () => controllerRef.current.openDatabaseFile(),
      newDatabase: () => controllerRef.current.newDatabaseFile(),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (controller.databaseStatus && !controller.databaseStatus.unlocked) return;
    return bindDocumentDrop(window, controller.prepareDocumentResult);
  }, [controller.databaseStatus, controller.prepareDocumentResult]);

  useLayoutEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    const root = document.documentElement;

    function syncTheme(): void {
      const theme = resolveTheme(controller.userState.profile?.theme, {
        prefersDark: darkQuery.matches,
        prefersContrast: contrastQuery.matches,
        forcedColors: forcedColorsQuery.matches,
      });
      applyResolvedTheme(root, theme);
      setColorScheme(theme.colorScheme);
    }

    syncTheme();
    const queries = [darkQuery, contrastQuery, forcedColorsQuery];
    for (const query of queries) query.addEventListener("change", syncTheme);
    return () => {
      for (const query of queries) query.removeEventListener("change", syncTheme);
    };
  }, [controller.userState.profile?.theme]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if (event.key === "Escape" && controller.activeDialog) {
        event.preventDefault();
        controller.closeDialog();
        return;
      }
      const isMac = document.documentElement.dataset.platform === "macos";
      const shortcuts = controller.userState.shortcuts;
      if (matchesShortcut(event, shortcuts.lockDatabase, isMac)) {
        event.preventDefault();
        if (controller.databaseStatus?.requiresEncryption !== false) void controller.lockDatabase();
      } else if (matchesShortcut(event, shortcuts.closeDatabase, isMac)) {
        event.preventDefault();
        if (controller.databaseStatus?.requiresEncryption !== false) void controller.closeDatabase();
      } else if (matchesShortcut(event, shortcuts.settings, isMac)) {
        event.preventDefault();
        controller.setSelectedNav("settings");
      } else if (matchesShortcut(event, shortcuts.newResult, isMac)) {
        event.preventDefault();
        controller.openDialog("lab");
      } else if (matchesShortcut(event, shortcuts.focusPrompt, isMac)) {
        event.preventDefault();
        controller.setSelectedNav("plan");
      } else if (matchesShortcut(event, shortcuts.overview, isMac)) {
        event.preventDefault();
        controller.setSelectedNav("body");
      } else if (matchesShortcut(event, shortcuts.timeline, isMac)) {
        event.preventDefault();
        controller.setSelectedNav("labs");
      } else if (matchesShortcut(event, shortcuts.documents, isMac)) {
        event.preventDefault();
        controller.setSelectedNav("documents");
      } else if (matchesShortcut(event, shortcuts.chat, isMac)) {
        event.preventDefault();
        controller.setSelectedNav("plan");
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [controller.activeDialog, controller.closeDialog, controller.closeDatabase, controller.lockDatabase, controller.openDialog, controller.setSelectedNav, controller.userState.shortcuts]);

  if (!controller.hasLoadedOnce) return <LoadingScreen />;
  if (controller.tauriUnavailable) return <DesktopOnlyScreen error={controller.loadError || TAURI_ONLY_MESSAGE} />;
  if (controller.databaseStatus && !controller.databaseStatus.unlocked) {
    return <><DatabaseGate controller={controller} /><Toaster position="top-center" richColors theme={colorScheme} /></>;
  }

  return (
    <TooltipProvider delayDuration={350}>
      <HealthWorkspace controller={controller} />
      <Toaster position="top-center" richColors theme={colorScheme} />
    </TooltipProvider>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-full place-items-center content-center gap-[18px] bg-canvas" aria-label={t("app.loading")}>
      <div className="fixed inset-x-0 top-0 h-10" data-tauri-drag-region="deep" />
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
      <div className="fixed inset-x-0 top-0 h-10" data-tauri-drag-region="deep" />
      <section className="max-w-[520px] rounded-[14px] bg-surface p-8 [corner-shape:superellipse(1.6)] shadow-[var(--shadow-float)]">
        <span className="grid size-[34px] place-items-center rounded-[11px] bg-primary text-white [corner-shape:superellipse(1.6)] shadow-[0_2px_5px_oklch(0.2_0.08_350/0.2)]"><Icon name="lock" /></span>
        <h1 className="mb-2 mt-5 text-2xl">{t("desktop.requiredTitle")}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-ink">{error}</p>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-ink">{t("desktop.requiredBody")} <code>bun run tauri:dev</code>. {t("desktop.requiredTail")}</p>
      </section>
    </main>
  );
}
