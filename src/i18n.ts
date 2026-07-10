import coreMessages from "./i18n/locales/en.json" with { type: "json" };
import geneticsMessages from "./i18n/genetics.en";

const messages = { ...coreMessages, ...geneticsMessages } as const;

export const defaultLocale = "en";
export type TranslationKey = keyof typeof messages;
export type TranslationValues = Record<string, number | string>;

export function t(key: TranslationKey, values: TranslationValues = {}): string {
  return messages[key].replace(/\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}
