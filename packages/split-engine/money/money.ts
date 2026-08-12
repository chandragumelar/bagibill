export interface Money {
  amountMinor: number;
  currency: string;
}

// spec.md 10: precision follows a product decision per currency, not the raw
// ISO 4217 minor-unit exponent (IDR is officially 2 in ISO, but nobody counts sen).
const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "JPY", "KRW", "VND"]);
const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);
const DEFAULT_DECIMAL_DIGITS = 2;

export function getCurrencyDecimalDigits(currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  return DEFAULT_DECIMAL_DIGITS;
}

function moneyParseError(rawInput: string, currency: string): Error {
  return new Error(`cannot parse money input "${rawInput}" for currency ${currency}`);
}

interface DigitSplit {
  integerDigits: string;
  fractionDigits: string;
}

// A trailing digit group only reads as the fraction when its length matches
// the currency's precision, or when it's the sole separator and shorter
// (partial typing, e.g. "12.5" for a 2-decimal currency). Anything else is
// a thousands grouping, since a dirty amount can use "." or "," for either role.
function splitIntegerAndFraction(unsigned: string, decimals: number): DigitSplit {
  const separatorCount = (unsigned.match(/[.,]/g) ?? []).length;
  if (separatorCount === 0) {
    return { integerDigits: unsigned, fractionDigits: "" };
  }

  const lastIndex = Math.max(unsigned.lastIndexOf("."), unsigned.lastIndexOf(","));
  const candidateFraction = unsigned.slice(lastIndex + 1);
  const isDecimalSeparator =
    candidateFraction.length === decimals || (separatorCount === 1 && candidateFraction.length < decimals);

  if (!isDecimalSeparator) {
    return { integerDigits: unsigned.replace(/[.,]/g, ""), fractionDigits: "" };
  }

  const integerDigits = unsigned.slice(0, lastIndex).replace(/[.,]/g, "");
  return { integerDigits, fractionDigits: candidateFraction };
}

export function parseMoney(rawInput: string, currency: string): Money {
  const decimals = getCurrencyDecimalDigits(currency);

  // Strip everything but digits/separators/sign in one pass — this is how
  // currency symbols, letters, and NBSP or regular spaces get dropped.
  const stripped = rawInput.replace(/[^0-9.,-]/g, "");

  const minusCount = (stripped.match(/-/g) ?? []).length;
  const startsWithMinus = stripped.startsWith("-");
  if (minusCount > 1 || (minusCount === 1 && !startsWithMinus)) {
    throw moneyParseError(rawInput, currency);
  }
  const unsigned = startsWithMinus ? stripped.slice(1) : stripped;

  if (unsigned === "" || !/[0-9]/.test(unsigned)) {
    throw moneyParseError(rawInput, currency);
  }

  const { integerDigits, fractionDigits } = splitIntegerAndFraction(unsigned, decimals);
  // Padding a short fraction to the currency's precision is what makes
  // "12.5" and "12.50" resolve to the same minor unit, not two different ones.
  const paddedFraction = fractionDigits.padEnd(decimals, "0");
  const digitsOnly = `${integerDigits}${paddedFraction}`;
  const amountMinor = Number.parseInt(digitsOnly, 10);

  return { amountMinor: startsWithMinus ? -amountMinor : amountMinor, currency };
}

export function formatMoney(money: Money): string {
  const decimals = getCurrencyDecimalDigits(money.currency);
  const sign = money.amountMinor < 0 ? "-" : "";
  const absoluteMinor = Math.abs(money.amountMinor);
  if (decimals === 0) return `${sign}${absoluteMinor}`;

  // Integer division via floor/modulo instead of a fractional major-unit
  // value keeps every intermediate an exact integer, never a parsed float.
  const scale = 10 ** decimals;
  const integerPart = Math.floor(absoluteMinor / scale);
  const fractionPart = absoluteMinor % scale;
  return `${sign}${integerPart}.${String(fractionPart).padStart(decimals, "0")}`;
}
