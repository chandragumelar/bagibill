export type Locale = "id" | "en";

export const SUPPORTED_LOCALES: readonly Locale[] = ["id", "en"];

export const LOCALE_BCP47: Record<Locale, string> = {
  id: "id-ID",
  en: "en-US",
};

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export type LocaleValue = string | ({ other: string } & Partial<Record<PluralCategory, string>>);

export type LocaleDictionary = Record<string, LocaleValue>;
