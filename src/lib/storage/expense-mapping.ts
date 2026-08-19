import { calculateExpense } from "@bagibill/split-engine";
import type {
  ChargeAllocation,
  ExpenseItem as EngineExpenseItem,
  ExtraCharge,
  SplitInput,
  Treat,
} from "@bagibill/split-engine";
import type {
  ChargeAllocationRecord,
  ChargeRecord,
  ExpenseItemRecord,
  ExpensePayerRecord,
  ExpenseRecord,
  SplitDataRecord,
  TreatRecord,
} from "./records";

type CalculateExpenseInput = Parameters<typeof calculateExpense>[0];

// Index order comes from the expense's own splitData, never from the
// group's current member list. Group member order shifts whenever someone
// is added or deactivated, but a saved expense has to keep producing the
// exact same numbers forever — so the expense carries its own participant
// list, and that list is index zero through n-1 (K-63).
export function resolveMemberOrder(splitData: SplitDataRecord): readonly string[] {
  if (splitData.mode === "evenly" || splitData.mode === "byItems") {
    return splitData.memberIds;
  }
  return splitData.entries.map((entry) => entry.memberId);
}

function buildMemberIndex(memberOrder: readonly string[]): ReadonlyMap<string, number> {
  return new Map(memberOrder.map((memberId, index) => [memberId, index]));
}

function requireMemberIndex(
  memberIndex: ReadonlyMap<string, number>,
  memberId: string,
  origin: string,
): number {
  const index = memberIndex.get(memberId);
  if (index === undefined) {
    throw new Error(`toCalculationInput: memberId "${memberId}" from ${origin} is not a participant of this expense`);
  }
  return index;
}

function buildItemIndex(items: readonly ExpenseItemRecord[]): ReadonlyMap<string, number> {
  return new Map(items.map((item, index) => [item.itemId, index]));
}

function requireItemIndex(itemIndex: ReadonlyMap<string, number>, itemId: string, origin: string): number {
  const index = itemIndex.get(itemId);
  if (index === undefined) {
    throw new Error(`toCalculationInput: itemId "${itemId}" from ${origin} is not an item of this expense`);
  }
  return index;
}

function buildEngineItems(
  items: readonly ExpenseItemRecord[],
  memberIndex: ReadonlyMap<string, number>,
): readonly EngineExpenseItem[] {
  return items.map((item) => ({
    unitPriceMinor: item.unitPriceMinor,
    quantity: item.quantity,
    claims: item.claims.map((claim) => ({
      participantIndex: requireMemberIndex(memberIndex, claim.memberId, `item "${item.itemId}" claim`),
      weight: claim.weight,
    })),
  }));
}

function buildSplitInput(
  splitData: SplitDataRecord,
  memberOrder: readonly string[],
  items: readonly EngineExpenseItem[],
): SplitInput {
  switch (splitData.mode) {
    case "evenly":
      return { mode: "evenly", participantCount: memberOrder.length };
    case "byAmounts":
      return { mode: "byAmounts", amountsMinor: splitData.entries.map((entry) => entry.amountMinor) };
    case "byPercentage":
      return { mode: "byPercentage", percentages: splitData.entries.map((entry) => entry.percent) };
    case "byWeights":
      return { mode: "byWeights", weights: splitData.entries.map((entry) => entry.weight) };
    case "byAdjustment":
      return {
        mode: "byAdjustment",
        adjustmentsMinor: splitData.entries.map((entry) => entry.adjustmentMinor),
      };
    case "byItems":
      return { mode: "byItems", participantCount: memberOrder.length, items };
  }
}

function buildChargeAllocation(
  allocation: ChargeAllocationRecord,
  memberIndex: ReadonlyMap<string, number>,
  itemIndex: ReadonlyMap<string, number>,
): ChargeAllocation {
  switch (allocation.mode) {
    case "proportional":
    case "even":
      return allocation;
    case "single_payer":
      return {
        mode: "single_payer",
        participantIndex: requireMemberIndex(memberIndex, allocation.memberId, "charge single_payer"),
      };
    case "items":
      return {
        mode: "items",
        itemIndices: allocation.itemIds.map((itemId) =>
          requireItemIndex(itemIndex, itemId, "charge items allocation"),
        ),
      };
  }
}

function buildCharges(
  charges: readonly ChargeRecord[],
  memberIndex: ReadonlyMap<string, number>,
  itemIndex: ReadonlyMap<string, number>,
): readonly ExtraCharge[] {
  return charges.map((charge) => ({
    amount: charge.amount,
    allocation: buildChargeAllocation(charge.allocation, memberIndex, itemIndex),
  }));
}

function buildTreat(
  treat: TreatRecord,
  memberIndex: ReadonlyMap<string, number>,
  itemIndex: ReadonlyMap<string, number>,
): Treat {
  if (treat.kind === "item") {
    return {
      kind: "item",
      sponsorIndex: requireMemberIndex(memberIndex, treat.sponsorMemberId, "treat item sponsor"),
      itemIndices: treat.itemIds.map((itemId) => requireItemIndex(itemIndex, itemId, "treat item")),
    };
  }
  const sponsorIndex = requireMemberIndex(memberIndex, treat.sponsorMemberId, `treat ${treat.kind} sponsor`);
  const beneficiaryIndex = requireMemberIndex(
    memberIndex,
    treat.beneficiaryMemberId,
    `treat ${treat.kind} beneficiary`,
  );
  if (treat.kind === "partial") {
    return { kind: "partial", sponsorIndex, beneficiaryIndex, amountMinor: treat.amountMinor };
  }
  return { kind: "person", sponsorIndex, beneficiaryIndex };
}

function buildTreats(
  treats: readonly TreatRecord[],
  memberIndex: ReadonlyMap<string, number>,
  itemIndex: ReadonlyMap<string, number>,
): readonly Treat[] {
  return treats.map((treat) => buildTreat(treat, memberIndex, itemIndex));
}

function buildPaymentsMinor(
  payers: readonly ExpensePayerRecord[],
  memberIndex: ReadonlyMap<string, number>,
  memberCount: number,
): readonly number[] {
  const amountsByIndex = new Map<number, number>();
  for (const payer of payers) {
    const index = requireMemberIndex(memberIndex, payer.memberId, "payers");
    amountsByIndex.set(index, (amountsByIndex.get(index) ?? 0) + payer.amountMinor);
  }
  return Array.from({ length: memberCount }, (_, index) => amountsByIndex.get(index) ?? 0);
}

// Translates a stored ExpenseRecord into calculateExpense's input shape.
// Any memberId or itemId referenced by payers/items/charges/treats that
// isn't actually a participant/item of this expense throws immediately,
// naming the value and where it came from — silently dropping it would mean
// money disappears from the breakdown without a trace.
export function toCalculationInput(expense: ExpenseRecord): CalculateExpenseInput {
  const memberOrder = resolveMemberOrder(expense.splitData);
  const memberIndex = buildMemberIndex(memberOrder);
  const itemIndex = buildItemIndex(expense.items);
  const engineItems = buildEngineItems(expense.items, memberIndex);
  return {
    totalMinor: expense.amountTotalMinor,
    split: buildSplitInput(expense.splitData, memberOrder, engineItems),
    charges: buildCharges(expense.charges, memberIndex, itemIndex),
    treats: buildTreats(expense.treats, memberIndex, itemIndex),
    paymentsMinor: buildPaymentsMinor(expense.payers, memberIndex, memberOrder.length),
  };
}

// The inverse of resolveMemberOrder: turns an array of per-index shares
// back into memberId-keyed results, so callers never need to think about
// indices at all.
export function mapSharesToMembers(
  shares: readonly number[],
  memberOrder: readonly string[],
): ReadonlyMap<string, number> {
  if (shares.length !== memberOrder.length) {
    throw new Error(
      `mapSharesToMembers: shares length ${shares.length} does not match member order length ${memberOrder.length}`,
    );
  }
  const entries = memberOrder.map((memberId, index): readonly [string, number] => {
    const shareMinor = shares[index];
    if (shareMinor === undefined) {
      throw new Error(`mapSharesToMembers: missing share at index ${index}`);
    }
    return [memberId, shareMinor];
  });
  return new Map(entries);
}
