import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

export function SecuritySettings({ controller }: { controller: DashboardController }) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void controller.changeDatabasePassword(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.security.title")}</CardTitle>
        <CardDescription>{t("settings.security.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <Field>
            <FieldLabel htmlFor="security-current-passphrase">{t("settings.security.currentPassphrase")}</FieldLabel>
            <Input id="security-current-passphrase" name="currentPassphrase" type="password" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="security-new-passphrase">{t("settings.security.newPassphrase")}</FieldLabel>
            <Input id="security-new-passphrase" name="newPassphrase" type="password" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="security-confirm-passphrase">{t("settings.security.confirmPassphrase")}</FieldLabel>
            <Input id="security-confirm-passphrase" name="confirmPassphrase" type="password" required />
          </Field>
          <Button type="submit">{t("settings.security.submit")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
