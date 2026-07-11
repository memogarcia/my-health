import { t } from "./i18n";

type TauriHost = {
  __TAURI_INTERNALS__?: unknown;
};

export const TAURI_ONLY_MESSAGE = t("runtime.tauriOnly");

export function isTauriRuntime(host: TauriHost | undefined = runtimeHost()): boolean {
  return Boolean(host && "__TAURI_INTERNALS__" in host);
}

function runtimeHost(): TauriHost | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as TauriHost);
}
