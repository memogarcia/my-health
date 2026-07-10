import { useState } from "react";
import type React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Folder, Plus, Sparkles } from "./health-icons";
import type { DatabaseStatus } from "../database-gate";
import { isDatabasePassphraseLongEnough, MIN_DATABASE_PASSPHRASE_LENGTH, normalizeDatabasePassphrase } from "../database-passphrase";
import { t } from "../i18n";

type Props = {
  status: DatabaseStatus;
  error: string;
  onNewDatabase: () => unknown;
  onOpenDatabase: () => unknown;
  onSubmit: (form: FormData) => unknown;
};

export function DatabaseGate({ status, error, onNewDatabase, onOpenDatabase, onSubmit }: Props) {
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const isSetup = status.state === "needsSetup";
  const isMigration = status.state === "legacyPlaintext";
  const needsConfirmation = isSetup || isMigration;
  const normalizedPassphrase = normalizeDatabasePassphrase(passphrase);
  const normalizedConfirmation = normalizeDatabasePassphrase(confirmation);
  const passphraseLongEnough = isDatabasePassphraseLongEnough(passphrase);
  const confirmationLongEnough = !needsConfirmation || isDatabasePassphraseLongEnough(confirmation);
  const passphrasesMatch = !needsConfirmation || normalizedPassphrase === normalizedConfirmation;
  const submitReady = passphraseLongEnough && confirmationLongEnough && passphrasesMatch;
  const validationMessage = passphrase.length === 0
    ? ""
    : !passphraseLongEnough
      ? t("gate.passphraseTooShort")
      : needsConfirmation && confirmation.length === 0
        ? t("gate.confirmRequired")
        : !confirmationLongEnough
          ? t("gate.passphraseTooShort")
          : !passphrasesMatch
            ? t("gate.passphrasesMismatch")
            : "";
  const eyebrow = isSetup ? t("gate.eyebrow.setup") : isMigration ? t("gate.eyebrow.migration") : t("gate.eyebrow.locked");
  const title = isSetup || isMigration ? t("gate.title.protect") : t("gate.title.unlock");
  const body = isSetup
    ? t("gate.body.setup")
    : isMigration
      ? t("gate.body.migration")
      : t("gate.body.locked");
  const button = isSetup ? t("gate.button.create") : isMigration ? t("gate.button.migrate") : t("gate.button.unlock");
  const help = isSetup || isMigration
    ? t("gate.help.setup")
    : t("gate.help.locked");
  const steps = isMigration
    ? [t("gate.step.encrypt"), t("gate.step.verify"), t("gate.step.removePlaintext")]
    : [t("gate.step.sqlcipher"), t("gate.step.local"), t("gate.step.onlyKey")];

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="gate-shell">
        <aside className="gate-brand">
          <div className="app-brand" data-tauri-drag-region>
            <span className="app-brand-icon"><Sparkles /></span>
            <span>
              <strong>{t("brand.name")}</strong>
              <small>{t("brand.subtitle")}</small>
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.09em] uppercase text-[var(--sidebar-muted)]">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{body}</p>
          </div>
          <div className="grid gap-3">
            {steps.map((item) => (
              <p className="gate-point" key={item}>
                <CheckCircle2 aria-hidden="true" />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </aside>

        <form
          className="flex flex-col justify-center gap-5 p-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (!submitReady) return;
            const form = new FormData(event.currentTarget);
            form.set("passphrase", normalizedPassphrase);
            if (needsConfirmation) form.set("confirmPassphrase", normalizedConfirmation);
            void onSubmit(form);
          }}
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("gate.passphrase")}</h2>
            <p className="text-sm text-muted-foreground">{help}</p>
          </div>
          <FieldGroup>
            {error ? <InlineAlert destructive>{error}</InlineAlert> : null}
            <Field data-invalid={passphrase.length > 0 && !passphraseLongEnough ? "true" : undefined}>
              <FieldLabel htmlFor="database-passphrase">{t("gate.passphrase")}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  id="database-passphrase"
                  minLength={MIN_DATABASE_PASSPHRASE_LENGTH}
                  name="passphrase"
                  onChange={(event) => setPassphrase(event.target.value)}
                  required
                  type={showPassphrase ? "text" : "password"}
                  value={passphrase}
                  aria-describedby={validationMessage ? "database-passphrase-validation" : undefined}
                  aria-invalid={passphrase.length > 0 && !passphraseLongEnough}
                />
                <Button type="button" variant="outline" size="icon" aria-pressed={showPassphrase} onClick={() => setShowPassphrase((value) => !value)}>
                  {showPassphrase ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
                  <span className="sr-only">{showPassphrase ? t("gate.hidePassphrase") : t("gate.showPassphrase")}</span>
                </Button>
              </div>
            </Field>
            {isSetup || isMigration ? (
              <Field data-invalid={confirmation.length > 0 && (!confirmationLongEnough || !passphrasesMatch) ? "true" : undefined}>
                <FieldLabel htmlFor="database-confirm-passphrase">{t("gate.confirmPassphrase")}</FieldLabel>
                <Input
                  id="database-confirm-passphrase"
                  minLength={MIN_DATABASE_PASSPHRASE_LENGTH}
                  name="confirmPassphrase"
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type={showPassphrase ? "text" : "password"}
                  value={confirmation}
                  aria-describedby={validationMessage ? "database-passphrase-validation" : undefined}
                  aria-invalid={confirmation.length > 0 && (!confirmationLongEnough || !passphrasesMatch)}
                />
              </Field>
            ) : null}
            {validationMessage ? (
              <FieldDescription id="database-passphrase-validation" role="status" aria-live="polite">
                {validationMessage}
              </FieldDescription>
            ) : null}
            <Button type="submit" size="lg" className="w-full text-base" disabled={!submitReady} aria-describedby={validationMessage ? "database-passphrase-validation" : undefined}>{button}</Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" size="lg" className="text-base" onClick={() => void onOpenDatabase()}>
                <Folder data-icon="inline-start" />{t("gate.openDatabase")}
              </Button>
              <Button type="button" variant="outline" size="lg" className="text-base" onClick={() => void onNewDatabase()}>
                <Plus data-icon="inline-start" />{t("gate.newDatabase")}
              </Button>
            </div>
            <div className="text-left text-sm leading-normal text-muted-foreground">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium">{t("gate.databaseLocation")}</summary>
                <span className="mt-2 block break-all">{status.dbPath}</span>
              </details>
            </div>
          </FieldGroup>
        </form>
      </div>
    </main>
  );
}

function InlineAlert({ children, destructive = false }: { children: React.ReactNode; destructive?: boolean }) {
  return (
    <Alert variant={destructive ? "destructive" : "default"}>
      {destructive ? <AlertTriangle /> : null}
      <AlertTitle>{destructive ? t("gate.alert.checkPassphrase") : t("gate.alert.status")}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
