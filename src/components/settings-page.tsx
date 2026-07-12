import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AiSettings } from "./ai-settings";
import { DataExportSettings } from "./data-export-settings";
import { ProfileSettings } from "./profile-settings";
import { GeneralSettings } from "./general-settings";
import { SecuritySettings } from "./security-settings";
import { ShortcutsSettings } from "./shortcuts-settings";

export function SettingsPage({ controller }: { controller: DashboardController }) {
  const developmentMock = controller.databaseStatus?.requiresEncryption === false;
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">
      <div className="grid gap-2 border-b border-border/55 pb-6">
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em]">{t("nav.settings.label")}</h1>
        <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">{t("nav.settings.description")}</p>
      </div>

      <Tabs defaultValue="general" orientation="vertical" className="flex flex-col gap-8 md:flex-row md:gap-10">
        <TabsList className="flex h-auto w-full flex-col items-start gap-0.5 bg-transparent p-0 md:w-56" variant="line">
          <TabsTrigger value="general" className="min-h-8 w-full justify-start px-2.5 py-1.5">{t("settings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="profile" className="min-h-8 w-full justify-start px-2.5 py-1.5">{t("settings.tabs.profile")}</TabsTrigger>
          <TabsTrigger value="ai" className="min-h-8 w-full justify-start px-2.5 py-1.5">{t("settings.tabs.ai")}</TabsTrigger>
          <TabsTrigger value="shortcuts" className="min-h-8 w-full justify-start px-2.5 py-1.5">{t("settings.tabs.shortcuts")}</TabsTrigger>
          {!developmentMock ? <TabsTrigger value="security" className="min-h-8 w-full justify-start px-2.5 py-1.5">{t("settings.tabs.security")}</TabsTrigger> : null}
          <TabsTrigger value="export" className="min-h-8 w-full justify-start px-2.5 py-1.5">{t("settings.tabs.export")}</TabsTrigger>
        </TabsList>
        <div className="flex-1 w-full">
          {developmentMock ? <p className="mb-4 rounded-lg bg-secondary px-3 py-2 text-xs leading-relaxed text-muted-ink">{t("settings.developmentMockNotice")}</p> : null}
          <TabsContent value="general" className="mt-0">
            <GeneralSettings controller={controller} />
          </TabsContent>
          <TabsContent value="profile" className="mt-0">
            <ProfileSettings controller={controller} />
          </TabsContent>
          <TabsContent value="ai" className="mt-0">
            <AiSettings controller={controller} />
          </TabsContent>
          <TabsContent value="shortcuts" className="mt-0">
            <ShortcutsSettings controller={controller} />
          </TabsContent>
          {!developmentMock ? <TabsContent value="security" className="mt-0">
            <SecuritySettings controller={controller} />
          </TabsContent> : null}
          <TabsContent value="export" className="mt-0">
            <DataExportSettings controller={controller} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
