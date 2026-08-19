import { getLocale } from "@/lib/i18n/locale-store";
import { LOCALE_BCP47 } from "@/lib/i18n/types";
import { getCurrencyDecimalDigits } from "@bagibill/split-engine";

// Re-export under the name this module has always used, so call sites don't
// change — the precision table itself now lives once, in the split engine
// (F1-01 debt, paid off in F1-10).
export function getCurrencyDecimals(currency: string): number {
  return getCurrencyDecimalDigits(currency);
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
