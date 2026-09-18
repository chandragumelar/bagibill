import { getCurrencyDecimalDigits } from "@bagibill/split-engine";

interface ConvertMinorAmountInput {
  amountMinor: number;
  fromCurrency: string;
  baseCurrency: string;
  fxRate: number;
}

interface DecimalFraction {
  numerator: bigint;
  denominator: bigint;
}

function parseDecimalFraction(value: number): DecimalFraction {
  const text = String(value).toLowerCase();
  const [mantissa = "", exponentText] = text.split("e");
  const [integerPart, fractionalPart = ""] = mantissa.split(".");
  const exponent = exponentText === undefined ? 0 : Number.parseInt(exponentText, 10);
  const digits = `${integerPart}${fractionalPart}`;
  const scale = fractionalPart.length - exponent;

  if (scale <= 0) {
    return {
      numerator: BigInt(digits) * 10n ** BigInt(-scale),
      denominator: 1n,
    };
  }

  return {
    numerator: BigInt(digits),
    denominator: 10n ** BigInt(scale),
  };
}

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const quotient = absoluteNumerator / denominator;
  const remainder = absoluteNumerator % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return sign * rounded;
}

function parseRate(fxRate: number, fromCurrency: string, baseCurrency: string): DecimalFraction {
  if (typeof fxRate !== "number" || !Number.isFinite(fxRate) || fxRate <= 0) {
    throw new Error(`Invalid fxRate for ${fromCurrency} to ${baseCurrency}: expected positive finite number`);
  }

  return parseDecimalFraction(fxRate);
}

export function convertMinorToBaseCurrency(input: ConvertMinorAmountInput): number {
  if (!Number.isSafeInteger(input.amountMinor)) {
    throw new Error(`Invalid amountTotalMinor for ${input.fromCurrency}: expected safe integer`);
  }

  const sourceDigits = getCurrencyDecimalDigits(input.fromCurrency);
  const baseDigits = getCurrencyDecimalDigits(input.baseCurrency);
  const rate = parseRate(input.fxRate, input.fromCurrency, input.baseCurrency);
  if (input.fromCurrency === input.baseCurrency && rate.numerator !== rate.denominator) {
    throw new Error(`Invalid fxRate for ${input.fromCurrency} to ${input.baseCurrency}: expected 1 for same currency`);
  }
  const sourceScale = 10n ** BigInt(sourceDigits);
  const baseScale = 10n ** BigInt(baseDigits);
  const numerator = BigInt(input.amountMinor) * rate.numerator * baseScale;
  const denominator = sourceScale * rate.denominator;
  const convertedMinor = roundHalfAwayFromZero(numerator, denominator);

  if (convertedMinor > BigInt(Number.MAX_SAFE_INTEGER) || convertedMinor < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`Converted amount exceeds safe integer range for ${input.baseCurrency}`);
  }

  return Number(convertedMinor);
}
