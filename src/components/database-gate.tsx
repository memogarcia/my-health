import { useState } from "react";
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
  const submit = status.state === "legacyPlaintext" ? t("gate.button.migrate") : setup ? t("gate.button.create") : t("gate.button.unlock");

  return (
    <main className="gate-screen">
      <section className="gate-intro" data-tauri-drag-region>
        <div className="gate-logo"><span className="brand-mark"><Icon name="heart" /></span><strong>{t("brand.name")}</strong></div>
        <div className="gate-copy">
          <span className="gate-lock"><Icon name="lock" size={22} /></span>
          <h1>{title}</h1>
          <p>{body}</p>
        </div>
        <ul className="gate-points">
          <li>{t("gate.step.sqlcipher")}</li>
          <li>{t("gate.step.local")}</li>
          <li>{t("gate.step.onlyKey")}</li>
        </ul>
      </section>
      <form className="gate-form squircle" onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        void controller.unlockDatabase(new FormData(event.currentTarget));
      }}>
        <div><h2>{t("gate.passphrase")}</h2><p>{setup ? t("gate.help.setup") : t("gate.help.locked")}</p></div>
        {controller.loadError ? <p className="form-error" role="alert">{controller.loadError}</p> : null}
        <label>{t("gate.passphrase")}
          <span className="input-with-button">
            <input autoFocus autoComplete={setup ? "new-password" : "current-password"} minLength={MIN_DATABASE_PASSPHRASE_LENGTH} name="passphrase" onChange={(event) => setPassphrase(event.target.value)} required type={show ? "text" : "password"} value={passphrase} />
            <button aria-label={show ? t("gate.hidePassphrase") : t("gate.showPassphrase")} aria-pressed={show} className="icon-button" onClick={() => setShow((value) => !value)} type="button"><Icon name="eye" /></button>
          </span>
        </label>
        {setup ? <label>{t("gate.confirmPassphrase")}<input minLength={MIN_DATABASE_PASSPHRASE_LENGTH} name="confirmPassphrase" onChange={(event) => setConfirmation(event.target.value)} required type={show ? "text" : "password"} value={confirmation} /></label> : null}
        {validationMessage ? <p className="form-validation" role="status">{validationMessage}</p> : null}
        <button className="primary-button" disabled={!ready} type="submit"><Icon name="lock" />{submit}</button>
        <div className="gate-actions">
          <button className="secondary-button" onClick={() => void controller.openDatabaseFile()} type="button"><Icon name="document" />{t("gate.openDatabase")}</button>
          <button className="secondary-button" onClick={() => void controller.newDatabaseFile()} type="button"><Icon name="plus" />{t("gate.newDatabase")}</button>
        </div>
        <details><summary>{t("gate.databaseLocation")}</summary><code>{status.dbPath}</code></details>
      </form>
    </main>
  );
}
