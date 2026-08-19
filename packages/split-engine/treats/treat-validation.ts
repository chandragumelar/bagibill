import type { Treat } from "./treat.types";

export function assertValidInput(
  sharesMinor: readonly number[],
  treats: readonly Treat[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): void {
  assertValidShares(sharesMinor);
  assertNonEmptyTreats(treats);
  assertValidItemSharesShape(itemSharesMinor, sharesMinor.length);
  treats.forEach((treat, treatIndex) => assertValidTreat(treat, treatIndex, sharesMinor.length, itemSharesMinor));
  assertNoRepeatedItemIndices(treats);
}

function assertValidShares(sharesMinor: readonly number[]): void {
  if (sharesMinor.length === 0) {
    throw applyTreatsError("sharesMinor must not be empty");
  }
  sharesMinor.forEach((shareMinor, participantIndex) => {
    if (!Number.isInteger(shareMinor)) {
      throw applyTreatsError(`sharesMinor[${participantIndex}] ${shareMinor} must be an integer`);
    }
  });
}

function assertNonEmptyTreats(treats: readonly Treat[]): void {
  if (treats.length === 0) {
    throw applyTreatsError("treats must not be empty");
  }
}

function assertValidItemSharesShape(
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  participantCount: number,
): void {
  if (itemSharesMinor === undefined) return;
  itemSharesMinor.forEach((row, itemIndex) => {
    if (row.length !== participantCount) {
      throw applyTreatsError(`itemSharesMinor row ${itemIndex} has length ${row.length}, expected ${participantCount}`);
    }
  });
}

function assertValidTreat(
  treat: Treat,
  treatIndex: number,
  participantCount: number,
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): void {
  assertValidParticipantIndex(treat.sponsorIndex, "sponsorIndex", participantCount, treatIndex);

  if (treat.kind === "item") {
    assertValidItemTreat(treat, treatIndex, itemSharesMinor);
    return;
  }

  assertValidParticipantIndex(treat.beneficiaryIndex, "beneficiaryIndex", participantCount, treatIndex);
  assertDistinctParticipants(treat.sponsorIndex, treat.beneficiaryIndex, treatIndex);

  if (treat.kind === "partial") {
    assertValidPartialAmount(treat.amountMinor, treatIndex);
  }
}

function assertValidParticipantIndex(
  index: number,
  fieldName: string,
  participantCount: number,
  treatIndex: number,
): void {
  const isInRange = Number.isInteger(index) && index >= 0 && index < participantCount;
  if (!isInRange) {
    throw applyTreatsTreatError(`${fieldName} ${index} is out of range [0, ${participantCount - 1}]`, treatIndex);
  }
}

function assertDistinctParticipants(sponsorIndex: number, beneficiaryIndex: number, treatIndex: number): void {
  if (sponsorIndex === beneficiaryIndex) {
    throw applyTreatsTreatError(`sponsorIndex and beneficiaryIndex must differ, both are ${sponsorIndex}`, treatIndex);
  }
}

function assertValidPartialAmount(amountMinor: number, treatIndex: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw applyTreatsTreatError(`amountMinor ${amountMinor} must be a positive integer`, treatIndex);
  }
}

function assertValidItemTreat(
  treat: Extract<Treat, { kind: "item" }>,
  treatIndex: number,
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): void {
  if (itemSharesMinor === undefined) {
    throw applyTreatsTreatError("item treat requires itemSharesMinor to be provided", treatIndex);
  }
  if (treat.itemIndices.length === 0) {
    throw applyTreatsTreatError("item treat requires at least one itemIndex", treatIndex);
  }

  const seenItemIndices = new Set<number>();
  for (const itemIndex of treat.itemIndices) {
    assertValidItemIndex(itemIndex, itemSharesMinor.length, treatIndex);
    if (seenItemIndices.has(itemIndex)) {
      throw applyTreatsTreatError(`itemIndex ${itemIndex} is listed more than once`, treatIndex);
    }
    seenItemIndices.add(itemIndex);
  }
}

function assertValidItemIndex(itemIndex: number, itemRowCount: number, treatIndex: number): void {
  const isInRange = Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < itemRowCount;
  if (!isInRange) {
    throw applyTreatsTreatError(`itemIndex ${itemIndex} is out of range [0, ${itemRowCount - 1}]`, treatIndex);
  }
}

function assertNoRepeatedItemIndices(treats: readonly Treat[]): void {
  const seenItemIndices = new Set<number>();
  treats.forEach((treat, treatIndex) => {
    if (treat.kind !== "item") return;
    for (const itemIndex of treat.itemIndices) {
      if (seenItemIndices.has(itemIndex)) {
        throw applyTreatsTreatError(`itemIndex ${itemIndex} is already treated by another item treat`, treatIndex);
      }
      seenItemIndices.add(itemIndex);
    }
  });
}

function applyTreatsError(reason: string): Error {
  return new Error(`applyTreats: ${reason}`);
}

function applyTreatsTreatError(reason: string, treatIndex: number): Error {
  return new Error(`applyTreats: ${reason} (treatIndex=${treatIndex})`);
}
