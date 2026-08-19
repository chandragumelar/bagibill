import { scaleDecimalToInteger } from "../shared/decimal-scale";

export function allocateByWeights(input: { totalMinor: number; weights: readonly number[] }): number[] {
  const { totalMinor, weights } = input;
  assertIntegerTotal(totalMinor, weights);
  assertValidWeights(weights, totalMinor);

  if (weights.length === 0) {
    if (totalMinor === 0) return [];
    throw allocationError("cannot allocate a non-zero total to zero participants", totalMinor, weights);
  }

  const decimalPlaces = Math.max(0, ...weights.map(countDecimalPlaces));
  const scaledWeights = weights.map((weight) => scaleDecimalToInteger(weight, decimalPlaces));
  const sumScaledWeights = scaledWeights.reduce((sum, weight) => sum + weight, 0n);
  if (sumScaledWeights === 0n) {
    throw allocationError("all weights are zero", totalMinor, weights);
  }

  return distributeLargestRemainder(totalMinor, scaledWeights, sumScaledWeights);
}

function allocationError(reason: string, totalMinor: number, weights: readonly number[]): Error {
  return new Error(`allocateByWeights: ${reason} (totalMinor=${totalMinor}, weights=[${weights.join(", ")}])`);
}

function assertIntegerTotal(totalMinor: number, weights: readonly number[]): void {
  if (Number.isInteger(totalMinor)) return;
  throw allocationError(`totalMinor must be an integer, got ${totalMinor}`, totalMinor, weights);
}

function assertValidWeights(weights: readonly number[], totalMinor: number): void {
  for (const weight of weights) {
    if (!Number.isFinite(weight)) {
      throw allocationError(`weight ${weight} is not a finite number`, totalMinor, weights);
    }
    if (weight < 0) {
      throw allocationError(`weight ${weight} is negative`, totalMinor, weights);
    }
  }
}

function countDecimalPlaces(weight: number): number {
  const text = weight.toString();
  const dotIndex = text.indexOf(".");
  return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
}

interface WeightedShare {
  readonly index: number;
  readonly floor: bigint;
  readonly remainder: bigint;
}

function computeShares(totalAbs: bigint, scaledWeights: readonly bigint[], sumScaledWeights: bigint): WeightedShare[] {
  return scaledWeights.map((weight, index) => {
    const idealNumerator = totalAbs * weight;
    return {
      index,
      floor: idealNumerator / sumScaledWeights,
      remainder: idealNumerator % sumScaledWeights,
    };
  });
}

// Descending by remainder; equal remainders return 0 and rely on Array#sort
// being stable, so ties resolve to the lower original index — reproducible
// on any device from the same input, with no member id needed to break it.
function compareRemaindersDescending(a: WeightedShare, b: WeightedShare): number {
  if (a.remainder === b.remainder) return 0;
  return a.remainder > b.remainder ? -1 : 1;
}

function distributeLargestRemainder(
  totalMinor: number,
  scaledWeights: readonly bigint[],
  sumScaledWeights: bigint,
): number[] {
  const isNegative = totalMinor < 0;
  const totalAbs = BigInt(Math.abs(totalMinor));

  const shares = computeShares(totalAbs, scaledWeights, sumScaledWeights);
  const flooredSum = shares.reduce((sum, share) => sum + share.floor, 0n);
  const leftoverUnits = Number(totalAbs - flooredSum);

  const sharesByRemainder = [...shares].sort(compareRemaindersDescending);
  const bonusIndices = new Set(sharesByRemainder.slice(0, leftoverUnits).map((share) => share.index));

  // Allocating on the absolute value then negating every element keeps the
  // floor division rounding toward zero on the positive side — flooring a
  // negative numerator directly would round the remainder the wrong way.
  return shares.map((share) => {
    const amount = share.floor + (bonusIndices.has(share.index) ? 1n : 0n);
    return Number(isNegative ? -amount : amount);
  });
}
