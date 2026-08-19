import { allocateByWeights } from "../allocation/allocate-by-weights";
import { scaleDecimalToInteger } from "../shared/decimal-scale";
import type { SplitResult } from "./split-result";

const MAX_PERCENTAGE_DECIMAL_PLACES = 2;
const BASIS_POINTS_PER_PERCENT = 100;
const TOTAL_BASIS_POINTS = 100 * BASIS_POINTS_PER_PERCENT;
const BASIS_POINT_TOLERANCE = 1;

export function splitByPercentage(input: { totalMinor: number; percentages: readonly number[] }): SplitResult {
  const { totalMinor, percentages } = input;
  assertIntegerTotal(totalMinor, percentages);
  assertValidPercentages(percentages, totalMinor);
  assertWithinTolerance(percentages, totalMinor);

  // Percentages that sum to 99.99 or 100.01 (within the 1 basis point
  // tolerance) are passed through as-is, uncorrected: allocateByWeights
  // normalizes against the sum of weights, so the allocation still totals
  // exactly totalMinor. The tolerance is enforced above by rejecting sums
  // further off than that, not by nudging the percentages themselves.
  const sharesMinor = allocateByWeights({ totalMinor, weights: percentages });

  return { sharesMinor, warnings: [] };
}

function splitByPercentageError(reason: string, totalMinor: number, percentages: readonly number[]): Error {
  return new Error(
    `splitByPercentage: ${reason} (totalMinor=${totalMinor}, percentages=[${percentages.join(", ")}])`,
  );
}

function assertIntegerTotal(totalMinor: number, percentages: readonly number[]): void {
  if (Number.isInteger(totalMinor)) return;
  throw splitByPercentageError(`totalMinor must be an integer, got ${totalMinor}`, totalMinor, percentages);
}

function assertValidPercentages(percentages: readonly number[], totalMinor: number): void {
  if (percentages.length === 0) {
    throw splitByPercentageError("percentages must not be empty", totalMinor, percentages);
  }
  for (const percentage of percentages) {
    if (!Number.isFinite(percentage)) {
      throw splitByPercentageError(`percentage ${percentage} is not a finite number`, totalMinor, percentages);
    }
    if (percentage < 0) {
      throw splitByPercentageError(`percentage ${percentage} must not be negative`, totalMinor, percentages);
    }
    if (countDecimalPlaces(percentage) > MAX_PERCENTAGE_DECIMAL_PLACES) {
      throw splitByPercentageError(
        `percentage ${percentage} has more than ${MAX_PERCENTAGE_DECIMAL_PLACES} decimal places`,
        totalMinor,
        percentages,
      );
    }
  }
}

function assertWithinTolerance(percentages: readonly number[], totalMinor: number): void {
  const sumBasisPoints = percentages.reduce(
    (sum, percentage) => sum + scaleDecimalToInteger(percentage, MAX_PERCENTAGE_DECIMAL_PLACES),
    0n,
  );
  const differenceBasisPoints = sumBasisPoints - BigInt(TOTAL_BASIS_POINTS);
  const absoluteDifferenceBasisPoints = differenceBasisPoints < 0n ? -differenceBasisPoints : differenceBasisPoints;

  if (absoluteDifferenceBasisPoints > BigInt(BASIS_POINT_TOLERANCE)) {
    throw splitByPercentageError(
      `percentages must sum to 100 within ${BASIS_POINT_TOLERANCE} basis point, got ${sumBasisPoints} basis points`,
      totalMinor,
      percentages,
    );
  }
}

function countDecimalPlaces(value: number): number {
  const text = value.toString();
  const dotIndex = text.indexOf(".");
  return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
}
