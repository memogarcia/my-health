import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { t, type TranslationKey } from "@/i18n";
import type { DashboardController } from "@/use-dashboard-controller";
import { DEFAULT_SHORTCUTS, formatShortcut, SHORTCUT_IDS, shortcutFromKeyboardEvent, type ShortcutId, type ShortcutMap } from "@/shortcuts";

const shortcutLabels: Record<ShortcutId, TranslationKey> = {
  overview: "shortcuts.overview",
  timeline: "shortcuts.timeline",
  documents: "shortcuts.documents",
  chat: "shortcuts.chat",
  settings: "shortcuts.settings",
  newResult: "shortcuts.newResult",
  focusPrompt: "shortcuts.focusPrompt",
  lockDatabase: "shortcuts.lockDatabase",
  closeDatabase: "shortcuts.closeDatabase",
};

export function ShortcutsSettings({ controller }: { controller: DashboardController }) {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(controller.userState.shortcuts);
  const [error, setError] = useState("");
  const isMac = document.documentElement.dataset.platform === "macos";

  useEffect(() => setShortcuts(controller.userState.shortcuts), [controller.userState.shortcuts]);

  function update(id: ShortcutId, nextValue: string): void {
    if (!nextValue || Object.entries(shortcuts).some(([otherId, value]) => otherId !== id && value === nextValue)) {
      setError(t("shortcuts.duplicate"));
      return;
    }
    const next = { ...shortcuts, [id]: nextValue } as ShortcutMap;
    setShortcuts(next);
    setError("");
    void controller.saveShortcuts(next);
  }

  function capture(event: React.KeyboardEvent<HTMLInputElement>, id: ShortcutId): void {
    event.preventDefault();
    const nextValue = shortcutFromKeyboardEvent(event.nativeEvent);
    if (nextValue) update(id, nextValue);
    else setError(t("shortcuts.captureHelp"));
  }

  function reset(): void {
    setShortcuts(DEFAULT_SHORTCUTS);
    setError("");
    void controller.saveShortcuts(DEFAULT_SHORTCUTS);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.shortcuts.title")}</CardTitle>
        <CardDescription>{t("settings.shortcuts.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          {SHORTCUT_IDS.map((id) => (
            <Field className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center" key={id}>
              <div className="grid gap-0.5"><FieldLabel>{t(shortcutLabels[id])}</FieldLabel>{id === "closeDatabase" ? <FieldDescription>{t("shortcuts.closeDescription")}</FieldDescription> : null}</div>
              <Input aria-label={t(shortcutLabels[id])} onKeyDown={(event) => capture(event, id)} readOnly value={formatShortcut(shortcuts[id], isMac)} />
            </Field>
          ))}
          {error ? <p className="text-xs leading-relaxed text-attention" role="alert">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/55 pt-4">
            <p className="text-xs leading-relaxed text-muted-ink">{t("shortcuts.captureHelp")}</p>
            <Button onClick={reset} type="button" variant="outline">{t("settings.shortcuts.restoreDefaults")}</Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
