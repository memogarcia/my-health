import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserProfile } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

export function GeneralSettings({ controller }: { controller: DashboardController }) {
  const profile = controller.userState.profile;
  const [theme, setTheme] = useState<UserProfile["theme"]>(profile.theme || "system");

  useEffect(() => {
    setTheme(profile.theme || "system");
  }, [profile]);

  function handleThemeChange(value: UserProfile["theme"]): void {
    setTheme(value);
    const form = new FormData();
    form.set("theme", value || "system");
    form.set("age", profile.age != null ? String(profile.age) : "");
    form.set("sex", profile.sex);
    form.set("anatomyModel", profile.anatomyModel);
    form.set("unitSystem", profile.unitSystem);
    form.set("heightCm", profile.heightCm != null ? String(profile.heightCm) : "");
    form.set("weightKg", profile.weightKg != null ? String(profile.weightKg) : "");
    void controller.saveProfile(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.general.title")}</CardTitle>
        <CardDescription>{t("settings.general.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="general-theme">{t("settings.profile.theme")}</FieldLabel>
          <Select value={theme} onValueChange={(value) => handleThemeChange(value as UserProfile["theme"])}>
            <SelectTrigger className="w-full sm:w-[240px]" id="general-theme"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="system">{t("settings.profile.themeSystem")}</SelectItem>
                <SelectItem value="light">{t("settings.profile.themeLight")}</SelectItem>
                <SelectItem value="dark">{t("settings.profile.themeDark")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}
