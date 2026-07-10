import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getAiProvider, hasEnabledCodexModel } from "../ai-sdk-config";
import { navGroups, navItems, type NavKey } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AddResultDropdown } from "./add-result-dropdown";
import { AlertTriangle, Lock, NotebookPen, Send, Sparkles } from "./health-icons";
import { navIcons } from "./health-icons";

type Props = {
  controller: DashboardController;
  children: React.ReactNode;
};

export function AppShell({ controller, children }: Props) {
  const activeItem = currentNavItem(controller.selectedNav);
  const pageTitleRef = useRef(null as HTMLHeadingElement | null);
  const workspaceRef = useRef(null as HTMLElement | null);
  const previousNavRef = useRef(controller.selectedNav);
  const showHealthActions = controller.selectedNav === "body";
  const showCompactAiPrompt = controller.selectedNav !== "settings" && controller.selectedNav !== "plan" && controller.selectedNav !== "research" && controller.selectedNav !== "documents";

  useEffect(() => {
    workspaceRef.current?.scrollTo({ top: 0 });
    if (previousNavRef.current !== controller.selectedNav) {
      pageTitleRef.current?.focus({ preventScroll: true });
      previousNavRef.current = controller.selectedNav;
    }
  }, [controller.selectedNav]);

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <div className="mac-titlebar-drag-region" data-tauri-drag-region aria-hidden="true" />
      <aside className="app-sidebar" data-tauri-drag-region="deep">
        <div className="app-brand">
          <span className="app-brand-icon">
            <Sparkles />
          </span>
          <span>
            <strong>{t("brand.name")}</strong>
            <small>{t("brand.subtitle")}</small>
          </span>
        </div>
        <nav className="app-nav" aria-label={t("nav.primary")}>
          {navGroups.map((group) => (
            <div className="grid gap-0.5" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.keys.map((key) => <NavButton controller={controller} navKey={key} key={key} />)}
            </div>
          ))}
          <div className="mt-auto pt-2">
            <NavButton controller={controller} navKey="settings" />
          </div>
        </nav>
        <div className="app-sidebar-footer">
          <Lock aria-hidden="true" />
          <span className="min-w-0">
            <strong>{t("database.localRecords")}</strong>
            {t("appShell.databaseEncrypted")}
          </span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-bar" data-tauri-drag-region="deep">
          <div className="app-page-title">
            <h1 id="app-page-title" ref={pageTitleRef} tabIndex={-1}>{activeItem.label}</h1>
            <p>{activeItem.description}</p>
          </div>
          {showHealthActions ? (
            <div className="app-bar-actions">
              <Button type="button" variant="outline" size="sm" onClick={() => controller.openDialog("activity")}>
                <NotebookPen data-icon="inline-start" />
                {t("appShell.dailyLog")}
              </Button>
              <AddResultDropdown controller={controller} />
            </div>
          ) : null}
        </header>

        <main ref={workspaceRef} className="workspace" data-nav={controller.selectedNav} aria-labelledby="app-page-title">
          <Notice controller={controller} />
          {children}
        </main>
        {showCompactAiPrompt ? <CompactAiPrompt controller={controller} /> : null}
      </div>
    </div>
  );
}

function NavButton({ controller, navKey }: { controller: DashboardController; navKey: NavKey }) {
  const item = currentNavItem(navKey);
  const Icon = navIcons[navKey];
  const active = navKey === controller.selectedNav;
  const index = navItems.findIndex((nav) => nav.key === navKey);
  const isMac = document.documentElement.dataset.platform === "macos";
  return (
    <Button
      aria-current={active ? "page" : undefined}
      className="app-nav-button"
      onClick={() => controller.setSelectedNav(navKey)}
      size="sm"
      title={item.description}
      type="button"
      variant="ghost"
    >
      <Icon data-icon="inline-start" />
      <span>{item.label}</span>
      <kbd aria-hidden="true">{isMac ? "⌘" : "^"}{index + 1}</kbd>
    </Button>
  );
}

function currentNavItem(selectedNav: NavKey) {
  for (const item of navItems) {
    if (item.key === selectedNav) return item;
  }
  return navItems[0];
}

function Notice({ controller }: { controller: DashboardController }) {
  if (!controller.loadError) return null;
  return (
    <div className="flex flex-col gap-2">
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertDescription>
          {t("appShell.backendUnavailable")} {controller.hasSnapshot ? t("appShell.showingLastLoaded") : t("appShell.startDesktop")} {controller.loadError}
        </AlertDescription>
      </Alert>
    </div>
  );
}

function CompactAiPrompt({ controller }: { controller: DashboardController }) {
  const [prompt, setPrompt] = useState("");
  const available = hasEnabledCodexModel(controller.aiSettings);
  const pending = Boolean(controller.aiPendingConversationId);
  const provider = getAiProvider(controller.aiSettings.providerId);

  if (!available) {
    return (
      <aside className="ai-prompt-bar ai-prompt-bar-unavailable" aria-label={t("appShell.askAiLabel")}>
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span className="truncate">{t("chat.setupRequired")}</span>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => controller.setSelectedNav("settings")}>
          {t("settings.ai.open")}
        </Button>
      </aside>
    );
  }

  return (
    <form
      className="ai-prompt-bar"
      aria-label={t("appShell.askAiLabel")}
      onSubmit={(event) => {
        event.preventDefault();
        void controller.submitAiPrompt(prompt);
        setPrompt("");
      }}
    >
      <span className="hidden items-center gap-2 text-sm font-medium text-muted-foreground sm:flex">
        <Sparkles className="size-4 text-primary" />
        {provider.label}
      </span>
      <Textarea
        aria-label={t("appShell.promptPlaceholder")}
        className="min-h-10 resize-none"
        disabled={pending}
        name="prompt"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) event.currentTarget.form?.requestSubmit();
        }}
        placeholder={t("appShell.promptPlaceholder")}
        rows={1}
        value={prompt}
      />
      <Button type="submit" disabled={pending || !prompt.trim()}>
        <Send data-icon="inline-start" />
        {t("common.send")}
      </Button>
    </form>
  );
}
