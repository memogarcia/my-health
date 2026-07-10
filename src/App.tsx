import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { t } from "./i18n";
import { configureNativeDatabaseMenu, configureNativeShell } from "./native-shell";
import { navItems } from "./dashboard-model";
import { bindDocumentDrop } from "./document-intake";
import { useDashboardController } from "./use-dashboard-controller";
import { AppShell } from "./components/app-shell";
import { BodyWorkspace } from "./components/body-workspace";
import { DatabaseGate } from "./components/database-gate";
import { IntakeDialog } from "./components/intake-dialog";

const AiChatPage = lazy(() => import("./components/ai-chat-page").then((module) => ({ default: module.AiChatPage })));
const ResearchPage = lazy(() => import("./components/deep-research-page").then((module) => ({ default: module.ResearchPage })));
const DocumentsPage = lazy(() => import("./components/documents-page").then((module) => ({ default: module.DocumentsPage })));
const HistoryPage = lazy(() => import("./components/history-page").then((module) => ({ default: module.HistoryPage })));
const MedicationsPage = lazy(() => import("./components/medications-page").then((module) => ({ default: module.MedicationsPage })));
const SettingsPage = lazy(() => import("./components/settings-page").then((module) => ({ default: module.SettingsPage })));
const DeveloperPage = lazy(() => import("./components/developer-page").then((module) => ({ default: module.DeveloperPage })));

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
      openDatabase: () => controllerRef.current.openDatabaseFile(),
      newDatabase: () => controllerRef.current.newDatabaseFile(),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (controller.databaseStatus && !controller.databaseStatus.unlocked) return;
    return bindDocumentDrop(window, controller.prepareDocumentResult);
  }, [controller]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if (event.key === "Escape" && controller.activeDialog) {
        event.preventDefault();
        controller.closeDialog();
        return;
      }
      const isMac = document.documentElement.dataset.platform === "macos";
      if (!(isMac ? event.metaKey : event.ctrlKey) || event.altKey) return;
      const nav = /^\d$/u.test(event.key) ? navItems[Number(event.key) - 1]?.key : undefined;
      if (event.key.toLowerCase() === ",") {
        event.preventDefault();
        controller.setSelectedNav("settings");
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        controller.openDialog("lab");
      } else if (nav) {
        event.preventDefault();
        controller.setSelectedNav(nav);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [controller]);

  if (!controller.hasLoadedOnce) return <LoadingShell />;
  if (controller.tauriUnavailable) return <DesktopOnlyScreen error={controller.loadError} />;
  if (controller.databaseStatus && !controller.databaseStatus.unlocked) {
    return (
      <>
        <DatabaseGate
          status={controller.databaseStatus}
          error={controller.loadError}
          onOpenDatabase={controller.openDatabaseFile}
          onNewDatabase={controller.newDatabaseFile}
          onSubmit={controller.unlockDatabase}
        />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <AppShell controller={controller}>
      {controller.selectedNav === "body" ? <BodyWorkspace controller={controller} /> : null}
      {controller.selectedNav === "labs" || controller.selectedNav === "symptoms" ? <LazyPage><HistoryPage controller={controller} /></LazyPage> : null}
      {controller.selectedNav === "plan" ? (
        <LazyPage><AiChatPage controller={controller} /></LazyPage>
      ) : null}
      {controller.selectedNav === "research" ? <LazyPage><ResearchPage controller={controller} /></LazyPage> : null}
      {controller.selectedNav === "documents" ? <LazyPage><DocumentsPage controller={controller} /></LazyPage> : null}
      {controller.selectedNav === "medications" ? <LazyPage><MedicationsPage controller={controller} /></LazyPage> : null}
      {controller.selectedNav === "settings" ? <LazyPage><SettingsPage controller={controller} /></LazyPage> : null}
      {controller.selectedNav === "developer" ? <LazyPage><DeveloperPage controller={controller} /></LazyPage> : null}
      <IntakeDialog controller={controller} />
      <Toaster position="top-center" />
    </AppShell>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>{children}</Suspense>;
}

function DesktopOnlyScreen({ error }: { error: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-8">
      <Card className="w-full max-w-xl">
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <AlertTitle>{t("desktop.requiredTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            {t("desktop.requiredBody")} <code>npm run dev</code> or <code>npm run tauri:dev</code>. {t("desktop.requiredTail")}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function LoadingShell() {
  return (
    <main className="app-shell min-h-screen bg-background">
      <aside className="app-sidebar">
        <Skeleton className="h-9 w-full bg-white/15" />
        <div className="grid gap-2">{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-8 w-full bg-white/10" key={index} />)}</div>
      </aside>
      <div className="app-main">
        <header className="app-bar">
          <div className="grid gap-1.5"><Skeleton className="h-5 w-28" /><Skeleton className="h-3 w-48" /></div>
          <div className="flex justify-end gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-28" /></div>
        </header>
        <section className="workspace">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="body-workspace-grid">
            <Skeleton className="h-[520px]" />
            <Skeleton className="h-[520px] rounded-xl" />
            <Skeleton className="h-[520px]" />
          </div>
        </section>
      </div>
    </main>
  );
}
