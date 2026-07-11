import { Menu, Submenu } from "@tauri-apps/api/menu";
import { navItems, type DialogKey, type NavKey } from "./dashboard-model";
import { t } from "./i18n";
import { isTauriRuntime } from "./tauri-runtime";

type ShortcutActions = {
  activeDialog: () => DialogKey;
  closeDialog: () => void;
  navigate: (nav: NavKey) => void;
  openDialog: (key: DialogKey & string) => void;
  render: () => void;
};

type DatabaseMenuActions = {
  lockDatabase: () => unknown;
  newDatabase: () => unknown;
  openDatabase: () => unknown;
};

export function configureNativeShell(): void {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) document.documentElement.dataset.platform = "macos";
  else if (platform.includes("win")) document.documentElement.dataset.platform = "windows";
  else if (platform.includes("linux")) document.documentElement.dataset.platform = "linux";
}

export async function configureNativeDatabaseMenu(actions: DatabaseMenuActions): Promise<void> {
  if (!isTauriRuntime()) return;
  const menu = await Menu.default();
  const databaseMenu = await Submenu.new({
    text: t("nativeMenu.database"),
    items: [
      { id: "open-database", text: t("nativeMenu.openDatabase"), accelerator: "CmdOrCtrl+O", action: () => void actions.openDatabase() },
      { id: "new-database", text: t("nativeMenu.newDatabase"), accelerator: "CmdOrCtrl+Shift+N", action: () => void actions.newDatabase() },
      { id: "lock-database", text: t("nativeMenu.lockDatabase"), accelerator: "CmdOrCtrl+L", action: () => void actions.lockDatabase() },
    ],
  });
  await menu.append(databaseMenu);
  await menu.setAsAppMenu();
}

export function bindNativeShortcuts(actions: ShortcutActions): void {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && actions.activeDialog()) {
      event.preventDefault();
      actions.closeDialog();
      actions.render();
      return;
    }

    const isMac = document.documentElement.dataset.platform === "macos";
    if (!(isMac ? event.metaKey : event.ctrlKey) || event.altKey) return;

    const nav = /^\d$/u.test(event.key) ? navItems[Number(event.key) - 1]?.key : undefined;
    if (nav) {
      event.preventDefault();
      actions.navigate(nav);
      actions.render();
      return;
    }

    const key = event.key.toLowerCase();
    if (key === ",") {
      event.preventDefault();
      actions.navigate("settings");
      actions.render();
    } else if (key === "n") {
      event.preventDefault();
      actions.openDialog("lab");
      actions.render();
    }
  });
}
