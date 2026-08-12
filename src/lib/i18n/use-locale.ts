import { useSyncExternalStore } from "react";
import { getLocale, setLocale, subscribeLocale } from "@/lib/i18n/locale-store";
import type { Locale } from "@/lib/i18n/types";

export interface UseLocaleResult {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

/** Baca bahasa aktif dan re-render otomatis waktu diganti, tanpa reload. */
export function useLocale(): UseLocaleResult {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return { locale, setLocale };
}
