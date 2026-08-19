import { allocateByWeights } from "../allocation/allocate-by-weights";
import type { ExtraCharge } from "./extra-charge.types";

const EVEN_WEIGHT = 1;

export function allocateChargeSharesMinor(params: {
  charge: ExtraCharge;
  chargeTotalMinor: number;
  baseSharesMinor: readonly number[];
  itemSharesMinor: readonly (readonly number[])[] | undefined;
  chargeIndex: number;
}): number[] {
  const { charge, chargeTotalMinor, baseSharesMinor, itemSharesMinor, chargeIndex } = params;
  const { allocation } = charge;

  switch (allocation.mode) {
    case "proportional":
      return allocateByWeights({ totalMinor: chargeTotalMinor, weights: baseSharesMinor });
    case "even":
      return allocateByWeights({ totalMinor: chargeTotalMinor, weights: evenWeights(baseSharesMinor.length) });
    case "single_payer":
      return allocateToSinglePayer(allocation.participantIndex, chargeTotalMinor, baseSharesMinor.length, chargeIndex);
    case "items":
      return allocateToItems(
        allocation.itemIndices,
        chargeTotalMinor,
        itemSharesMinor,
        baseSharesMinor.length,
        chargeIndex,
      );
  }
}

function evenWeights(participantCount: number): number[] {
  return Array.from({ length: participantCount }, () => EVEN_WEIGHT);
}

function allocateToSinglePayer(
  participantIndex: number,
  chargeTotalMinor: number,
  participantCount: number,
  chargeIndex: number,
): number[] {
  assertValidParticipantIndex(participantIndex, participantCount, chargeIndex);
  const sharesMinor = new Array<number>(participantCount).fill(0);
  sharesMinor[participantIndex] = chargeTotalMinor;
  return sharesMinor;
}

function assertValidParticipantIndex(participantIndex: number, participantCount: number, chargeIndex: number): void {
  const isInRange = Number.isInteger(participantIndex) && participantIndex >= 0 && participantIndex < participantCount;
  if (!isInRange) {
    throw chargeAllocationError(
      `participantIndex ${participantIndex} is out of range [0, ${participantCount - 1}]`,
      chargeIndex,
    );
  }
}

function allocateToItems(
  itemIndices: readonly number[],
  chargeTotalMinor: number,
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  participantCount: number,
  chargeIndex: number,
): number[] {
  assertItemSharesProvided(itemSharesMinor, chargeIndex);
  assertValidItemIndices(itemIndices, itemSharesMinor.length, chargeIndex);
  assertNegativeItemsAmount(chargeTotalMinor, chargeIndex);

  const weights = sumItemWeights(itemIndices, itemSharesMinor, participantCount);
  return allocateByWeights({ totalMinor: chargeTotalMinor, weights });
}

function assertItemSharesProvided(
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  chargeIndex: number,
): asserts itemSharesMinor is readonly (readonly number[])[] {
  if (itemSharesMinor === undefined) {
    throw chargeAllocationError("mode items requires itemSharesMinor to be provided", chargeIndex);
  }
}

function assertValidItemIndices(itemIndices: readonly number[], itemRowCount: number, chargeIndex: number): void {
  if (itemIndices.length === 0) {
    throw chargeAllocationError("mode items requires at least one itemIndex", chargeIndex);
  }
  const seenItemIndices = new Set<number>();
  for (const itemIndex of itemIndices) {
    assertValidItemIndex(itemIndex, itemRowCount, chargeIndex);
    if (seenItemIndices.has(itemIndex)) {
      throw chargeAllocationError(`itemIndex ${itemIndex} is listed more than once`, chargeIndex);
    }
    seenItemIndices.add(itemIndex);
  }
}

function assertValidItemIndex(itemIndex: number, itemRowCount: number, chargeIndex: number): void {
  const isInRange = Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < itemRowCount;
  if (!isInRange) {
    throw chargeAllocationError(`itemIndex ${itemIndex} is out of range [0, ${itemRowCount - 1}]`, chargeIndex);
  }
}

function assertNegativeItemsAmount(chargeTotalMinor: number, chargeIndex: number): void {
  if (chargeTotalMinor >= 0) {
    throw chargeAllocationError(
      `mode items only supports a negative charge amount, got ${chargeTotalMinor}`,
      chargeIndex,
    );
  }
}

function sumItemWeights(
  itemIndices: readonly number[],
  itemSharesMinor: readonly (readonly number[])[],
  participantCount: number,
): number[] {
  return Array.from({ length: participantCount }, (_, participantIndex) =>
    itemIndices.reduce((sum, itemIndex) => {
      const row = requireItemRow(itemSharesMinor, itemIndex);
      return sum + requireRowValue(row, participantIndex);
    }, 0),
  );
}

// itemIndices and participantIndex are both validated in range before this
// runs, so these reads are unreachable in practice — required only to
// satisfy noUncheckedIndexedAccess.
function requireItemRow(itemSharesMinor: readonly (readonly number[])[], itemIndex: number): readonly number[] {
  const row = itemSharesMinor[itemIndex];
  if (row === undefined) {
    throw new Error(`allocateExtraCharges: internal error, missing item row at index ${itemIndex}`);
  }
  return row;
}

function requireRowValue(row: readonly number[], participantIndex: number): number {
  const value = row[participantIndex];
  if (value === undefined) {
    throw new Error(`allocateExtraCharges: internal error, missing value at index ${participantIndex}`);
  }
  return value;
}

function chargeAllocationError(reason: string, chargeIndex: number): Error {
  return new Error(`allocateExtraCharges: ${reason} (chargeIndex=${chargeIndex})`);
}
