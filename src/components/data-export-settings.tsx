import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isDatabasePassphraseLongEnough, MIN_DATABASE_PASSPHRASE_LENGTH, normalizeDatabasePassphrase } from "../database-passphrase";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Download } from "./health-icons";

export function DataExportSettings({ controller }: { controller: DashboardController }) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const normalizedPassphrase = normalizeDatabasePassphrase(passphrase);
  const normalizedConfirmation = normalizeDatabasePassphrase(confirmation);
  const passphraseLongEnough = isDatabasePassphraseLongEnough(passphrase);
  const confirmationLongEnough = isDatabasePassphraseLongEnough(confirmation);
  const passphrasesMatch = normalizedPassphrase === normalizedConfirmation;
  const exportReady = passphraseLongEnough && confirmationLongEnough && passphrasesMatch;
  const validationMessage = passphrase.length === 0
    ? t("settings.export.passphraseHelp")
    : !passphraseLongEnough
      ? t("settings.export.passphraseTooShort")
      : confirmation.length === 0
        ? t("settings.export.confirmRequired")
        : !confirmationLongEnough
          ? t("settings.export.passphraseTooShort")
        : !passphrasesMatch
          ? t("settings.export.passphrasesMismatch")
          : t("settings.export.ready");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.export.title")}</CardTitle>
        <CardDescription>{t("settings.export.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (exportReady) void controller.exportDatabase(normalizedPassphrase, normalizedConfirmation);
        }}>
          <FieldGroup>
            <Field data-invalid={passphrase.length > 0 && !passphraseLongEnough ? "true" : undefined}>
              <FieldLabel htmlFor="exportPassphrase">{t("settings.export.passphrase")}</FieldLabel>
              <Input
                id="exportPassphrase"
                name="exportPassphrase"
                type="password"
                minLength={MIN_DATABASE_PASSPHRASE_LENGTH}
                autoComplete="new-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                aria-describedby="export-passphrase-validation"
                aria-invalid={passphrase.length > 0 && !passphraseLongEnough}
                required
              />
            </Field>
            <Field data-invalid={confirmation.length > 0 && (!confirmationLongEnough || !passphrasesMatch) ? "true" : undefined}>
              <FieldLabel htmlFor="confirmExportPassphrase">{t("settings.export.confirmPassphrase")}</FieldLabel>
              <Input
                id="confirmExportPassphrase"
                name="confirmExportPassphrase"
                type="password"
                minLength={MIN_DATABASE_PASSPHRASE_LENGTH}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-describedby="export-passphrase-validation"
                aria-invalid={confirmation.length > 0 && (!confirmationLongEnough || !passphrasesMatch)}
                required
              />
            </Field>
            <FieldDescription id="export-passphrase-validation" role="status" aria-live="polite">
              {validationMessage}
            </FieldDescription>
            <Button type="submit" disabled={!exportReady} aria-describedby="export-passphrase-validation">
              <Download data-icon="inline-start" />{t("settings.export.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
