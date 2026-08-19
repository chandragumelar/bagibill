import { allocateByWeights } from "../allocation/allocate-by-weights";
import type { SplitWarning } from "./split-result";
import type { ExpenseItem, ItemBreakdown, ItemClaim, ItemSplitResult } from "./split-by-items.types";

export function splitByItems(input: {
  participantCount: number;
  items: readonly ExpenseItem[];
}): ItemSplitResult {
  const { participantCount, items } = input;
  assertValidParticipantCount(participantCount);
  assertNonEmptyItems(items);
  items.forEach((item, itemIndex) => assertValidItem(item, itemIndex, participantCount));

  const perItem = items.map((item) => buildItemBreakdown(item, participantCount));
  const sharesMinor = sumSharesAcrossItems(perItem, participantCount);
  const unclaimedTotalMinor = sumUnclaimedTotal(perItem);
  // totalMinor is derived from the items, not accepted as a separate input —
  // items are the source of truth in this mode, a caller-supplied total could
  // silently disagree with them.
  const totalMinor = perItem.reduce((sum, breakdown) => sum + breakdown.itemTotalMinor, 0);
  const warnings = buildWarnings(perItem);

  return { sharesMinor, perItem, unclaimedTotalMinor, totalMinor, warnings };
}

function buildItemBreakdown(item: ExpenseItem, participantCount: number): ItemBreakdown {
  const itemTotalMinor = item.unitPriceMinor * item.quantity;

  if (item.claims.length === 0) {
    return {
      itemTotalMinor,
      sharesMinor: new Array<number>(participantCount).fill(0),
      isUnclaimed: true,
      hasWeightMismatch: false,
    };
  }

  const claimWeights = item.claims.map((claim) => claim.weight);
  const claimSharesMinor = allocateByWeights({ totalMinor: itemTotalMinor, weights: claimWeights });
  const sharesMinor = scatterClaimShares(item.claims, claimSharesMinor, participantCount);
  const claimWeightSum = claimWeights.reduce((sum, weight) => sum + weight, 0);

  return { itemTotalMinor, sharesMinor, isUnclaimed: false, hasWeightMismatch: claimWeightSum !== item.quantity };
}

function scatterClaimShares(
  claims: readonly ItemClaim[],
  claimSharesMinor: readonly number[],
  participantCount: number,
): number[] {
  const sharesMinor = new Array<number>(participantCount).fill(0);
  claims.forEach((claim, claimIndex) => {
    sharesMinor[claim.participantIndex] = requireIndexedValue(claimSharesMinor, claimIndex);
  });
  return sharesMinor;
}

function sumSharesAcrossItems(perItem: readonly ItemBreakdown[], participantCount: number): number[] {
  return Array.from({ length: participantCount }, (_, participantIndex) =>
    perItem.reduce((sum, breakdown) => sum + requireIndexedValue(breakdown.sharesMinor, participantIndex), 0),
  );
}

function sumUnclaimedTotal(perItem: readonly ItemBreakdown[]): number {
  return perItem
    .filter((breakdown) => breakdown.isUnclaimed)
    .reduce((sum, breakdown) => sum + breakdown.itemTotalMinor, 0);
}

function buildWarnings(perItem: readonly ItemBreakdown[]): SplitWarning[] {
  const unclaimedItemIndices = collectIndices(perItem, (breakdown) => breakdown.isUnclaimed);
  const weightMismatchItemIndices = collectIndices(perItem, (breakdown) => breakdown.hasWeightMismatch);

  const warnings: SplitWarning[] = [];
  if (unclaimedItemIndices.length > 0) {
    warnings.push({ code: "unclaimed_items", itemIndices: unclaimedItemIndices });
  }
  if (weightMismatchItemIndices.length > 0) {
    warnings.push({ code: "claim_weight_mismatch", itemIndices: weightMismatchItemIndices });
  }
  return warnings;
}

function collectIndices(
  perItem: readonly ItemBreakdown[],
  predicate: (breakdown: ItemBreakdown) => boolean,
): number[] {
  return perItem
    .map((breakdown, itemIndex) => ({ breakdown, itemIndex }))
    .filter(({ breakdown }) => predicate(breakdown))
    .map(({ itemIndex }) => itemIndex);
}

// allocateByWeights returns one entry per weight it was given, and both call
// sites here read it back positionally, so the guard below is unreachable in
// practice — required only to satisfy noUncheckedIndexedAccess.
function requireIndexedValue(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`splitByItems: internal error, missing value at index ${index}`);
  }
  return value;
}

function splitByItemsError(reason: string): Error {
  return new Error(`splitByItems: ${reason}`);
}

function splitByItemsItemError(reason: string, itemIndex: number): Error {
  return new Error(`splitByItems: ${reason} (itemIndex=${itemIndex})`);
}

function assertValidParticipantCount(participantCount: number): void {
  if (!Number.isInteger(participantCount) || participantCount <= 0) {
    throw splitByItemsError(`participantCount must be a positive integer, got ${participantCount}`);
  }
}

function assertNonEmptyItems(items: readonly ExpenseItem[]): void {
  if (items.length === 0) {
    throw splitByItemsError("items must not be empty");
  }
}

function assertValidItem(item: ExpenseItem, itemIndex: number, participantCount: number): void {
  assertValidUnitPrice(item.unitPriceMinor, itemIndex);
  assertValidQuantity(item.quantity, itemIndex);
  assertValidClaims(item.claims, itemIndex, participantCount);
}

function assertValidUnitPrice(unitPriceMinor: number, itemIndex: number): void {
  if (!Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw splitByItemsItemError(`unitPriceMinor ${unitPriceMinor} must be a non-negative integer`, itemIndex);
  }
}

function assertValidQuantity(quantity: number, itemIndex: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw splitByItemsItemError(`quantity ${quantity} must be a positive integer`, itemIndex);
  }
}

function assertValidClaims(claims: readonly ItemClaim[], itemIndex: number, participantCount: number): void {
  const seenParticipantIndices = new Set<number>();
  let hasNonZeroWeight = false;

  for (const claim of claims) {
    assertValidParticipantIndex(claim.participantIndex, itemIndex, participantCount);
    assertNoDuplicateClaim(claim.participantIndex, seenParticipantIndices, itemIndex);
    seenParticipantIndices.add(claim.participantIndex);
    assertValidClaimWeight(claim.weight, itemIndex);
    if (claim.weight > 0) hasNonZeroWeight = true;
  }

  if (claims.length > 0 && !hasNonZeroWeight) {
    throw splitByItemsItemError("item has claims but all claim weights are zero", itemIndex);
  }
}

function assertValidParticipantIndex(participantIndex: number, itemIndex: number, participantCount: number): void {
  const isInRange = Number.isInteger(participantIndex) && participantIndex >= 0 && participantIndex < participantCount;
  if (!isInRange) {
    throw splitByItemsItemError(
      `participantIndex ${participantIndex} is out of range [0, ${participantCount - 1}]`,
      itemIndex,
    );
  }
}

function assertNoDuplicateClaim(participantIndex: number, seenParticipantIndices: Set<number>, itemIndex: number): void {
  if (seenParticipantIndices.has(participantIndex)) {
    throw splitByItemsItemError(`participantIndex ${participantIndex} claims this item more than once`, itemIndex);
  }
}

function assertValidClaimWeight(weight: number, itemIndex: number): void {
  if (!Number.isFinite(weight) || weight < 0) {
    throw splitByItemsItemError(`claim weight ${weight} must be a non-negative finite number`, itemIndex);
  }
}
