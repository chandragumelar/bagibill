import { getLocale } from "@/lib/i18n/locale-store";
import { LOCALE_BCP47 } from "@/lib/i18n/types";

/**
 * Format Date lewat Intl sesuai bahasa aktif. `date` selalu parameter,
 * tidak pernah Date.now() di sini — pemanggil yang bertanggung jawab
 * menyuntikkan waktu lewat Clock.
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE_BCP47[getLocale()], options).format(date);
}
