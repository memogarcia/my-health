import { documentDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { t } from "./i18n";

const databaseFilters = [{ name: t("databasePicker.sqlite"), extensions: ["sqlite3", "sqlite", "db"] }];

export async function pickExistingDatabase(defaultPath?: string): Promise<string | null> {
  const selected = await open({
    title: t("databasePicker.openTitle"),
    multiple: false,
    filters: databaseFilters,
    defaultPath,
    fileAccessMode: "scoped",
  });
  return typeof selected === "string" ? selected : null;
}

export async function defaultNewDatabasePath(): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  return join(await documentDir(), `health-dashboard-${stamp}.sqlite3`);
}

export async function newLocalDatabasePath(): Promise<string | null> {
  const defaultPath = await defaultNewDatabasePath();
  const selected = await save({
    title: t("databasePicker.newTitle"),
    filters: databaseFilters,
    defaultPath,
    canCreateDirectories: true,
  });
  return selected || null;
}
