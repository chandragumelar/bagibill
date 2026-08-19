import type { SplitWarning } from "../modes/split-result";
import { computeChargeTotalsMinor } from "./charge-amount";
import { allocateChargeSharesMinor } from "./charge-allocation";
import type { ChargeBreakdown, ExtraCharge, ExtraChargeResult } from "./extra-charge.types";

export function allocateExtraCharges(input: {
  baseSharesMinor: readonly number[];
  charges: readonly ExtraCharge[];
  itemSharesMinor?: readonly (readonly number[])[];
}): ExtraChargeResult {
  const { baseSharesMinor, charges, itemSharesMinor } = input;
  assertValidBaseShares(baseSharesMinor);
  assertNonEmptyCharges(charges);
  assertProportionalIsPossible(baseSharesMinor, charges);
  assertValidItemSharesShape(itemSharesMinor, baseSharesMinor.length);

  const subtotalMinor = sumMinor(baseSharesMinor);
  const chargeTotalsMinor = computeChargeTotalsMinor(charges, subtotalMinor);
  const perCharge = buildPerCharge(charges, chargeTotalsMinor, baseSharesMinor, itemSharesMinor);
  const totalSharesMinor = combineShares(baseSharesMinor, perCharge);
  const chargesTotalMinor = sumMinor(chargeTotalsMinor);
  const warnings = buildNegativeShareWarnings(totalSharesMinor);

  return { totalSharesMinor, perCharge, chargesTotalMinor, subtotalMinor, warnings };
}

function buildPerCharge(
  charges: readonly ExtraCharge[],
  chargeTotalsMinor: readonly number[],
  baseSharesMinor: readonly number[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): ChargeBreakdown[] {
  return charges.map((charge, chargeIndex) => {
    const chargeTotalMinor = requireIndexedValue(chargeTotalsMinor, chargeIndex);
    const sharesMinor = allocateChargeSharesMinor({
      charge,
      chargeTotalMinor,
      baseSharesMinor,
      itemSharesMinor,
      chargeIndex,
    });
    return { chargeTotalMinor, sharesMinor };
  });
}

function combineShares(baseSharesMinor: readonly number[], perCharge: readonly ChargeBreakdown[]): number[] {
  return baseSharesMinor.map((baseShareMinor, participantIndex) =>
    perCharge.reduce(
      (sum, breakdown) => sum + requireIndexedValue(breakdown.sharesMinor, participantIndex),
      baseShareMinor,
    ),
  );
}

function buildNegativeShareWarnings(totalSharesMinor: readonly number[]): SplitWarning[] {
  const indices = totalSharesMinor
    .map((shareMinor, index) => ({ shareMinor, index }))
    .filter(({ shareMinor }) => shareMinor < 0)
    .map(({ index }) => index);

  return indices.length === 0 ? [] : [{ code: "negative_share", indices }];
}

function sumMinor(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

// allocateChargeSharesMinor always returns one share per participant, and
// computeChargeTotalsMinor always returns one total per charge, so these
// reads are unreachable in practice — required only to satisfy
// noUncheckedIndexedAccess.
function requireIndexedValue(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`allocateExtraCharges: internal error, missing value at index ${index}`);
  }
  return value;
}

function allocateExtraChargesError(reason: string): Error {
  return new Error(`allocateExtraCharges: ${reason}`);
}

function assertValidBaseShares(baseSharesMinor: readonly number[]): void {
  if (baseSharesMinor.length === 0) {
    throw allocateExtraChargesError("baseSharesMinor must not be empty");
  }
  baseSharesMinor.forEach((shareMinor, participantIndex) => {
    if (!Number.isInteger(shareMinor)) {
      throw allocateExtraChargesError(`baseSharesMinor[${participantIndex}] ${shareMinor} must be an integer`);
    }
  });
}

function assertNonEmptyCharges(charges: readonly ExtraCharge[]): void {
  if (charges.length === 0) {
    throw allocateExtraChargesError("charges must not be empty");
  }
}

function assertProportionalIsPossible(baseSharesMinor: readonly number[], charges: readonly ExtraCharge[]): void {
  const hasProportionalCharge = charges.some((charge) => charge.allocation.mode === "proportional");
  if (!hasProportionalCharge) return;

  if (baseSharesMinor.some((shareMinor) => shareMinor < 0)) {
    throw allocateExtraChargesError(
      "cannot allocate a proportional charge when baseSharesMinor has a negative element",
    );
  }
  if (baseSharesMinor.every((shareMinor) => shareMinor === 0)) {
    throw allocateExtraChargesError("cannot allocate a proportional charge when all baseSharesMinor are zero");
  }
}

function assertValidItemSharesShape(
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  participantCount: number,
): void {
  if (itemSharesMinor === undefined) return;
  itemSharesMinor.forEach((row, itemIndex) => {
    if (row.length !== participantCount) {
      throw allocateExtraChargesError(
        `itemSharesMinor row ${itemIndex} has length ${row.length}, expected ${participantCount}`,
      );
    }
  });
}
