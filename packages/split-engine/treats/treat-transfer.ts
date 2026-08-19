import type { Treat, TreatTransfer } from "./treat.types";

export function processTreats(
  sharesMinor: readonly number[],
  treats: readonly Treat[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): { finalSharesMinor: number[]; transfers: TreatTransfer[] } {
  const workingSharesMinor = [...sharesMinor];
  const transfers: TreatTransfer[] = [];

  // Treats run in order over the running result of prior treats, not
  // resolved transitively — each treat is a promise made at one moment, not
  // a system solved all at once. If A treats B, then B treats C, B's share
  // is zeroed first and only then grows again by C's share; A still covers
  // only B's old share, not the end state after B treats C.
  treats.forEach((treat, treatIndex) => {
    applyTreat(treat, treatIndex, workingSharesMinor, itemSharesMinor, transfers);
  });

  return { finalSharesMinor: workingSharesMinor, transfers };
}

function applyTreat(
  treat: Treat,
  treatIndex: number,
  workingSharesMinor: number[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  transfers: TreatTransfer[],
): void {
  if (treat.kind === "person") {
    applyPersonTreat(treat, workingSharesMinor, transfers);
    return;
  }
  if (treat.kind === "partial") {
    applyPartialTreat(treat, workingSharesMinor, transfers);
    return;
  }
  applyItemTreat(treat, treatIndex, workingSharesMinor, itemSharesMinor, transfers);
}

function applyPersonTreat(
  treat: Extract<Treat, { kind: "person" }>,
  workingSharesMinor: number[],
  transfers: TreatTransfer[],
): void {
  // A beneficiary already at zero or negative (already treated once, or
  // left negative by a discount) is not an error — there's simply nothing
  // left to move, so zero moves and zero transfers are recorded.
  const beneficiaryShareMinor = readShare(workingSharesMinor, treat.beneficiaryIndex);
  const amountMinor = Math.max(beneficiaryShareMinor, 0);

  workingSharesMinor[treat.beneficiaryIndex] = beneficiaryShareMinor - amountMinor;
  addToShare(workingSharesMinor, treat.sponsorIndex, amountMinor);
  recordTransfer(transfers, treat.sponsorIndex, treat.beneficiaryIndex, amountMinor);
}

function applyPartialTreat(
  treat: Extract<Treat, { kind: "partial" }>,
  workingSharesMinor: number[],
  transfers: TreatTransfer[],
): void {
  workingSharesMinor[treat.beneficiaryIndex] =
    readShare(workingSharesMinor, treat.beneficiaryIndex) - treat.amountMinor;
  addToShare(workingSharesMinor, treat.sponsorIndex, treat.amountMinor);
  recordTransfer(transfers, treat.sponsorIndex, treat.beneficiaryIndex, treat.amountMinor);
}

function applyItemTreat(
  treat: Extract<Treat, { kind: "item" }>,
  treatIndex: number,
  workingSharesMinor: number[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  transfers: TreatTransfer[],
): void {
  // Already validated before processing starts — re-asserted here only to
  // narrow the type for TypeScript across the function/file boundary.
  assertItemSharesProvided(itemSharesMinor, treatIndex);

  // Only the item amount moves, not any proportional extra charge sitting
  // on top of it — itemSharesMinor comes from splitByItems, which runs
  // before the charges layer, so the sponsor is not treated to "their tax"
  // on this item. The sponsor's own claim on these items is never moved:
  // only every *other* claimant's share is transferred to the sponsor.
  for (let participantIndex = 0; participantIndex < workingSharesMinor.length; participantIndex++) {
    if (participantIndex === treat.sponsorIndex) continue;
    const amountMinor = sumItemSharesFor(treat.itemIndices, itemSharesMinor, participantIndex);
    if (amountMinor <= 0) continue;

    workingSharesMinor[participantIndex] = readShare(workingSharesMinor, participantIndex) - amountMinor;
    addToShare(workingSharesMinor, treat.sponsorIndex, amountMinor);
    recordTransfer(transfers, treat.sponsorIndex, participantIndex, amountMinor);
  }
}

function sumItemSharesFor(
  itemIndices: readonly number[],
  itemSharesMinor: readonly (readonly number[])[],
  participantIndex: number,
): number {
  return itemIndices.reduce(
    (sum, itemIndex) => sum + readShare(requireItemRow(itemSharesMinor, itemIndex), participantIndex),
    0,
  );
}

function recordTransfer(
  transfers: TreatTransfer[],
  sponsorIndex: number,
  beneficiaryIndex: number,
  amountMinor: number,
): void {
  if (amountMinor <= 0) return;
  transfers.push({ sponsorIndex, beneficiaryIndex, amountMinor });
}

function addToShare(sharesMinor: number[], index: number, amountMinor: number): void {
  sharesMinor[index] = readShare(sharesMinor, index) + amountMinor;
}

// Every index used here is validated in range before processing starts, so
// this is unreachable in practice — required only to satisfy
// noUncheckedIndexedAccess.
function readShare(sharesMinor: readonly number[], index: number): number {
  const value = sharesMinor[index];
  if (value === undefined) {
    throw new Error(`applyTreats: internal error, missing share at index ${index}`);
  }
  return value;
}

function requireItemRow(itemSharesMinor: readonly (readonly number[])[], itemIndex: number): readonly number[] {
  const row = itemSharesMinor[itemIndex];
  if (row === undefined) {
    throw new Error(`applyTreats: internal error, missing item row at index ${itemIndex}`);
  }
  return row;
}

function assertItemSharesProvided(
  itemSharesMinor: readonly (readonly number[])[] | undefined,
  treatIndex: number,
): asserts itemSharesMinor is readonly (readonly number[])[] {
  if (itemSharesMinor === undefined) {
    throw new Error(`applyTreats: item treat requires itemSharesMinor to be provided (treatIndex=${treatIndex})`);
  }
}
