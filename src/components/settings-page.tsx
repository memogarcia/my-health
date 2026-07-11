import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AiSettings } from "./ai-settings";
import { DataExportSettings } from "./data-export-settings";
import { ProfileSettings } from "./profile-settings";
import { GeneralSettings } from "./general-settings";
import { SecuritySettings } from "./security-settings";

export function SettingsPage({ controller }: { controller: DashboardController }) {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.settings.label")}</h1>
        <p className="text-muted-foreground text-base">{t("nav.settings.description")}</p>
      </div>

      <Tabs defaultValue="general" orientation="vertical" className="flex flex-col md:flex-row gap-6 md:gap-10">
        <TabsList className="flex flex-col w-full md:w-56 items-start h-auto bg-transparent p-0 gap-1" variant="line">
          <TabsTrigger value="general" className="w-full justify-start px-3 py-2">{t("settings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="profile" className="w-full justify-start px-3 py-2">{t("settings.tabs.profile")}</TabsTrigger>
          <TabsTrigger value="ai" className="w-full justify-start px-3 py-2">{t("settings.tabs.ai")}</TabsTrigger>
          <TabsTrigger value="security" className="w-full justify-start px-3 py-2">{t("settings.tabs.security")}</TabsTrigger>
          <TabsTrigger value="export" className="w-full justify-start px-3 py-2">{t("settings.tabs.export")}</TabsTrigger>
        </TabsList>
        <div className="flex-1 w-full">
          <TabsContent value="general" className="mt-0">
            <GeneralSettings controller={controller} />
          </TabsContent>
          <TabsContent value="profile" className="mt-0">
            <ProfileSettings controller={controller} />
          </TabsContent>
          <TabsContent value="ai" className="mt-0">
            <AiSettings controller={controller} />
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <SecuritySettings controller={controller} />
          </TabsContent>
          <TabsContent value="export" className="mt-0">
            <DataExportSettings controller={controller} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
