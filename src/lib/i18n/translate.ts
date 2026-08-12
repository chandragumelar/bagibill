import { getLocale } from "@/lib/i18n/locale-store";
import { LOCALE_BCP47, type Locale, type LocaleDictionary, type LocaleValue } from "@/lib/i18n/types";
import { en } from "@/locales/en";
import { id } from "@/locales/id";

const DICTIONARIES: Record<Locale, LocaleDictionary> = { id, en };

export type TranslateParams = Record<string, string | number>;

function resolveText(value: LocaleValue, locale: Locale, count: number | undefined): string {
  if (typeof value === "string") return value;
  if (count === undefined) return value.other;
  const category = new Intl.PluralRules(LOCALE_BCP47[locale]).select(count);
  return value[category] ?? value.other;
}

function interpolate(template: string, params: TranslateParams | undefined): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

/**
 * Terjemahkan satu kunci ke bahasa aktif. `params.count`, kalau ada, ikut
 * dipakai buat pilih bentuk jamak lewat Intl.PluralRules.
 */
export function t(key: string, params?: TranslateParams): string {
  const locale = getLocale();
  const value = DICTIONARIES[locale][key];
  if (value === undefined) {
    throw new Error(`t: kunci "${key}" tidak ada di kamus "${locale}"`);
  }
  const count = typeof params?.count === "number" ? params.count : undefined;
  return interpolate(resolveText(value, locale, count), params);
}
