import { useState } from "react";
import { Button } from "@/components/ui/button";
import { isDatabasePassphraseLongEnough, MIN_DATABASE_PASSPHRASE_LENGTH, normalizeDatabasePassphrase } from "../database-passphrase";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { Icon } from "./icon";

export function DatabaseGate({ controller }: { controller: DashboardController }) {
  const status = controller.databaseStatus;
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  if (!status) return null;
  const setup = status.state === "needsSetup" || status.state === "legacyPlaintext";
  const normalizedPassphrase = normalizeDatabasePassphrase(passphrase);
  const normalizedConfirmation = normalizeDatabasePassphrase(confirmation);
  const passphraseLongEnough = isDatabasePassphraseLongEnough(passphrase);
  const confirmationLongEnough = !setup || isDatabasePassphraseLongEnough(confirmation);
  const passphrasesMatch = !setup || normalizedPassphrase === normalizedConfirmation;
  const ready = passphraseLongEnough && confirmationLongEnough && passphrasesMatch;
  const validationMessage = passphrase.length === 0 ? ""
    : !passphraseLongEnough ? t("gate.passphraseTooShort")
      : setup && confirmation.length === 0 ? t("gate.confirmRequired")
        : !confirmationLongEnough ? t("gate.passphraseTooShort")
          : !passphrasesMatch ? t("gate.passphrasesMismatch") : "";
  const title = setup ? t("gate.title.protect") : t("gate.title.unlock");
  const body = status.state === "legacyPlaintext" ? t("gate.body.migration") : setup ? t("gate.body.setup") : t("gate.body.locked");
  const formTitle = title;
  const formBody = setup ? body : t("gate.help.locked");
  const submit = status.state === "legacyPlaintext" ? t("gate.button.migrate") : setup ? t("gate.button.create") : t("gate.button.unlock");

  return (
    <main className="grid min-h-full place-items-center bg-canvas px-6 pb-8 pt-[72px]">
      <form className="w-[min(460px,100%)] rounded-[14px] border border-border bg-surface p-7 shadow-[var(--elev-2)] [corner-shape:superellipse(1.6)]" onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        void controller.unlockDatabase(new FormData(event.currentTarget));
      }}>
        <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-sm bg-accent text-accent-ink"><Icon name="heart" /></span><div><h1 className="text-xl tracking-[-0.02em]">{formTitle}</h1><p className="mt-[3px] text-sm leading-relaxed text-muted-ink">{formBody}</p></div></div>
        {setup ? <p className="mt-[18px] text-sm leading-relaxed text-muted-ink">{t("gate.help.setup")}</p> : null}
        {controller.loadError ? <p className="mt-[18px] rounded-[10px] bg-[oklch(0.36_0.055_25)] px-3 py-2.5 text-xs text-[oklch(0.88_0.1_25)]" role="alert">{controller.loadError}</p> : null}
        <label className="mt-[18px] grid gap-[7px] text-xs font-semibold text-muted-ink">{t("gate.passphrase")}
          <span className="flex items-center rounded-[11px] bg-secondary focus-within:bg-surface">
            <input autoFocus autoComplete={setup ? "new-password" : "current-password"} className="w-full min-h-10 rounded-[11px] border-0 bg-transparent p-[9px_11px] text-sm text-ink outline-0" minLength={MIN_DATABASE_PASSPHRASE_LENGTH} name="passphrase" onChange={(event) => setPassphrase(event.target.value)} required type={show ? "text" : "password"} value={passphrase} />
            <button aria-label={show ? t("gate.hidePassphrase") : t("gate.showPassphrase")} aria-pressed={show} className="inline-flex size-9 shrink-0 items-center justify-center text-muted-ink transition-colors hover:bg-surface-soft hover:text-ink" onClick={() => setShow((value) => !value)} type="button"><Icon name="eye" /></button>
          </span>
        </label>
        {setup ? <label className="mt-[18px] grid gap-[7px] text-xs font-semibold text-muted-ink">{t("gate.confirmPassphrase")}<input className="mt-[7px] w-full min-h-10 rounded-[11px] border-0 bg-secondary p-[9px_11px] text-sm text-ink outline-0 focus:bg-surface" minLength={MIN_DATABASE_PASSPHRASE_LENGTH} name="confirmPassphrase" onChange={(event) => setConfirmation(event.target.value)} required type={show ? "text" : "password"} value={confirmation} /></label> : null}
        {validationMessage ? <p className="mt-[9px] text-xs leading-relaxed text-[oklch(0.75_0.1_35)]" role="status">{validationMessage}</p> : null}
        <Button className="mt-[22px] w-full" disabled={!ready} type="submit"><Icon name="lock" />{submit}</Button>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void controller.openDatabaseFile()} type="button"><Icon name="document" />{t("gate.openDatabase")}</Button>
          <Button variant="secondary" onClick={() => void controller.newDatabaseFile()} type="button"><Icon name="plus" />{t("gate.newDatabase")}</Button>
        </div>
        <details className="mt-5 text-xs text-muted-ink"><summary>{t("gate.databaseLocation")}</summary><code className="mt-2 block break-all">{status.dbPath}</code></details>
      </form>
    </main>
  );
}
