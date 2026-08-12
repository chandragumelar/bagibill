import { getLocale } from "@/lib/i18n/locale-store";
import { LOCALE_BCP47 } from "@/lib/i18n/types";

// spec.md 10: presisi desimal mengikuti standar per mata uang, bukan
// default ISO yang dipakai Intl (IDR di ISO tercatat 2 desimal, tapi
// praktiknya nol sen dipakai di mana-mana).
const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "JPY", "KRW", "VND"]);
const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);

export function getCurrencyDecimals(currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  return 2;
}

/**
 * Format nominal dari integer minor unit (sen untuk USD, angka polos untuk
 * IDR) jadi teks lokal lewat Intl — nol nilai float, nol format manual.
 */
export function formatMoney(amountMinor: number, currency: string): string {
  const decimals = getCurrencyDecimals(currency);
  const amountMajor = amountMinor / 10 ** decimals;
  return new Intl.NumberFormat(LOCALE_BCP47[getLocale()], {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amountMajor);
}
