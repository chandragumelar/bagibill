import type { ChargeAmount, ExtraCharge } from "./extra-charge.types";

const MAX_PERCENT_DECIMAL_PLACES = 2;
const BASIS_POINTS_PER_PERCENT = 100;
const BASIS_POINT_DENOMINATOR = BigInt(100 * BASIS_POINTS_PER_PERCENT);

export function computeChargeTotalsMinor(charges: readonly ExtraCharge[], subtotalMinor: number): number[] {
  const chargeTotalsMinor: number[] = [];

  charges.forEach((charge, chargeIndex) => {
    const runningTotalMinor = subtotalMinor + sumMinor(chargeTotalsMinor);
    chargeTotalsMinor.push(computeAmountMinor(charge.amount, subtotalMinor, runningTotalMinor, chargeIndex));
  });

  return chargeTotalsMinor;
}

function sumMinor(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function computeAmountMinor(
  amount: ChargeAmount,
  subtotalMinor: number,
  runningTotalMinor: number,
  chargeIndex: number,
): number {
  if (amount.kind === "fixed") {
    assertValidFixedAmount(amount.amountMinor, chargeIndex);
    return amount.amountMinor;
  }

  // The basis has no default because there is no single right answer:
  // Indonesia's service charge is computed from the subtotal, then PB1 from
  // subtotal plus service (running_total) — but US tip is computed from the
  // subtotal even though it's entered after tax. Either default would be
  // wrong for the other case, and spec.md 7.2 calls this the most common
  // mistake to get backwards.
  const basisMinor = amount.basis === "subtotal" ? subtotalMinor : runningTotalMinor;
  return computePercentAmountMinor(amount.percent, basisMinor, chargeIndex);
}

function assertValidFixedAmount(amountMinor: number, chargeIndex: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw chargeAmountError(`amountMinor ${amountMinor} must be an integer`, chargeIndex);
  }
}

function computePercentAmountMinor(percent: number, basisMinor: number, chargeIndex: number): number {
  assertValidPercent(percent, chargeIndex);
  const basisPoints = scalePercentToBasisPoints(percent);
  // Rounded half away from zero, like a receipt or a cashier's calculator —
  // banker's rounding would make the app's number disagree with the paper in
  // front of the person holding it. Symmetric around zero so a percent
  // discount and a percent tax round the same way.
  return Number(roundHalfAwayFromZero(BigInt(basisMinor) * basisPoints, BASIS_POINT_DENOMINATOR));
}

function assertValidPercent(percent: number, chargeIndex: number): void {
  if (!Number.isFinite(percent)) {
    throw chargeAmountError(`percent ${percent} is not a finite number`, chargeIndex);
  }
  if (countDecimalPlaces(percent) > MAX_PERCENT_DECIMAL_PLACES) {
    throw chargeAmountError(
      `percent ${percent} has more than ${MAX_PERCENT_DECIMAL_PLACES} decimal places`,
      chargeIndex,
    );
  }
}

function countDecimalPlaces(value: number): number {
  const text = value.toString();
  const dotIndex = text.indexOf(".");
  return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
}

// Local duplicate of the pad-concatenate-BigInt scaling technique used in
// allocate-by-weights.ts and split-by-percentage.ts. This is the third
// implementation, a dedup candidate for F1-10 alongside the other two.
function scalePercentToBasisPoints(percent: number): bigint {
  const text = percent.toString();
  const [wholeDigits, fractionDigits = ""] = text.split(".");
  const paddedFraction = fractionDigits.padEnd(MAX_PERCENT_DECIMAL_PLACES, "0");
  const digits = `${wholeDigits}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return BigInt(digits);
}

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const isNegative = numerator < 0n;
  const absNumerator = isNegative ? -numerator : numerator;
  const quotient = absNumerator / denominator;
  const remainder = absNumerator % denominator;
  const roundedAbs = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return isNegative ? -roundedAbs : roundedAbs;
}

function chargeAmountError(reason: string, chargeIndex: number): Error {
  return new Error(`allocateExtraCharges: ${reason} (chargeIndex=${chargeIndex})`);
}
