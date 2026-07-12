import { Menu, Submenu } from "@tauri-apps/api/menu";
import { isTauriRuntime } from "./runtime";
import { t } from "./i18n";

type DatabaseMenuActions = {
  lockDatabase: () => unknown;
  closeDatabase: () => unknown;
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
      { id: "close-database", text: t("nativeMenu.closeDatabase"), accelerator: "CmdOrCtrl+Shift+W", action: () => void actions.closeDatabase() },
      { id: "lock-database", text: t("nativeMenu.lockDatabase"), accelerator: "CmdOrCtrl+L", action: () => void actions.lockDatabase() },
    ],
  });
  await menu.append(databaseMenu);
  await menu.setAsAppMenu();
}
