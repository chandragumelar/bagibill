import { allocateByWeights } from "../allocation/allocate-by-weights";
import { computeExpenseBalance, computeGroupBalances } from "../balance/compute-balances";
import type { ExpenseLedger } from "../balance/balance.types";
import type { SettlementResult, Transfer } from "./settlement.types";

export function computeSettlement(input: {
  participantCount: number;
  expenses: readonly ExpenseLedger[];
  mode: "direct" | "simplified";
}): SettlementResult {
  const { participantCount, expenses, mode } = input;
  assertValidMode(mode);
  // computeGroupBalances already validates everything about participantCount
  // and expenses (F1-08) — called first, before any pairwise or simplified
  // computation, so bad input is always rejected the same way regardless of
  // mode, even though pairwiseTransfers is computed for both modes and could
  // otherwise run first in some code path. Its error is left to propagate
  // unwrapped rather than re-thrown under this function's name.
  const groupBalance = computeGroupBalances({ participantCount, expenses });

  const pairwiseTransfers = computePairwiseTransfers(expenses);
  // pairwiseTransfers is always populated regardless of mode — spec.md 11.1
  // and plan.md both require the per-pair detail to survive Simplify being
  // on, for the trace-through screen. In direct mode, `transfers` is the
  // exact same list: deliberate duplication so a caller rendering the main
  // list never has to know which mode produced it.
  const transfers = mode === "direct" ? pairwiseTransfers : computeSimplifiedTransfers(groupBalance.netMinor);

  return { transfers, pairwiseTransfers };
}

function assertValidMode(mode: string): void {
  if (mode !== "direct" && mode !== "simplified") {
    throw new Error(`computeSettlement: mode must be "direct" or "simplified", got ${mode}`);
  }
}

// "Who owes whom" only has meaning inside one expense, since that's the only
// place the machine knows who fronted the money — a group-level net has
// already lost the pairing information, leaving only a bare number per
// person.
function computePairwiseTransfers(expenses: readonly ExpenseLedger[]): Transfer[] {
  const rawTransfers = expenses.flatMap((expense) => {
    const { netMinor } = computeExpenseBalance(expense);
    return computeExpenseNetTransfers(netMinor);
  });
  return mergeOppositeDirections(rawTransfers);
}

// Each debtor's debt is allocated across creditors weighted by their
// *remaining* surplus, depleted as debtors are processed in index order —
// not the original surplus on every call. Reusing the original surplus for
// every debtor would let independent per-debtor rounding push some
// creditors above their true surplus and others below it; depleting keeps
// both the row sums (each debtor pays exactly their debt) and the column
// sums (each creditor receives exactly their surplus) exact.
function computeExpenseNetTransfers(netMinor: readonly number[]): Transfer[] {
  const creditorIndices = collectIndices(netMinor, (net) => net > 0);
  const debtorIndices = collectIndices(netMinor, (net) => net < 0);
  const remainingSurplusMinor = creditorIndices.map((index) => requireIndexedValue(netMinor, index));

  const transfers: Transfer[] = [];
  for (const debtorIndex of debtorIndices) {
    const debtMinor = -requireIndexedValue(netMinor, debtorIndex);
    const allocatedMinor = allocateByWeights({ totalMinor: debtMinor, weights: remainingSurplusMinor });
    allocatedMinor.forEach((amountMinor, position) => {
      if (amountMinor <= 0) return;
      const creditorIndex = requireIndexedValue(creditorIndices, position);
      transfers.push({ fromIndex: debtorIndex, toIndex: creditorIndex, amountMinor });
      remainingSurplusMinor[position] = requireIndexedValue(remainingSurplusMinor, position) - amountMinor;
    });
  }
  return transfers;
}

// Two people owing each other in opposite directions and being asked to
// transfer back and forth makes no sense to anyone reading the screen, and
// Direct mode exists so people only deal with who they actually owe, not to
// pad the list.
function mergeOppositeDirections(rawTransfers: readonly Transfer[]): Transfer[] {
  const netByLowerUpper = new Map<number, Map<number, number>>();
  rawTransfers.forEach((transfer) => addSignedAmount(netByLowerUpper, transfer));

  const merged: Transfer[] = [];
  for (const [lower, upperMap] of netByLowerUpper) {
    for (const [upper, netAmountMinor] of upperMap) {
      if (netAmountMinor === 0) continue;
      merged.push(
        netAmountMinor > 0
          ? { fromIndex: lower, toIndex: upper, amountMinor: netAmountMinor }
          : { fromIndex: upper, toIndex: lower, amountMinor: -netAmountMinor },
      );
    }
  }
  return sortByFromThenTo(merged);
}

function addSignedAmount(netByLowerUpper: Map<number, Map<number, number>>, transfer: Transfer): void {
  const lower = Math.min(transfer.fromIndex, transfer.toIndex);
  const upper = Math.max(transfer.fromIndex, transfer.toIndex);
  const signedAmountMinor = transfer.fromIndex === lower ? transfer.amountMinor : -transfer.amountMinor;

  const upperMap = netByLowerUpper.get(lower) ?? new Map<number, number>();
  upperMap.set(upper, (upperMap.get(upper) ?? 0) + signedAmountMinor);
  netByLowerUpper.set(lower, upperMap);
}

// Ascending by fromIndex then toIndex — the array index is the only ordering
// the machine has, consistent with K-24 and K-29.
function sortByFromThenTo(transfers: readonly Transfer[]): Transfer[] {
  return [...transfers].sort((a, b) => a.fromIndex - b.fromIndex || a.toIndex - b.toIndex);
}

function collectIndices(values: readonly number[], predicate: (value: number) => boolean): number[] {
  return values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => predicate(value))
    .map(({ index }) => index);
}

// netMinor is read only at indices it was itself built from, and
// creditorIndices/remainingSurplusMinor are always the same length, so this
// read is unreachable in practice — required only to satisfy
// noUncheckedIndexedAccess.
function requireIndexedValue(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`computeSettlement: internal error, missing value at index ${index}`);
  }
  return value;
}

interface BalanceEntry {
  readonly index: number;
  remainingMinor: number;
}

// Greedy on two sorted lists (spec.md 11.2): take the largest debtor and the
// largest creditor, transfer the smaller of the two amounts, drop whichever
// hit zero, repeat. Every amount here is an integer and every step uses a
// plain minimum of two integers, so no rounding ever happens in this
// function — the rounding spec.md 11.2 mentions ("penanganan sisa
// pembulatan") is already resolved upstream, in the split into shares and in
// the pairwise allocation, not here.
function computeSimplifiedTransfers(groupNetMinor: readonly number[]): Transfer[] {
  const debtors = buildBalanceEntries(groupNetMinor, (net) => net < 0, (net) => -net);
  const creditors = buildBalanceEntries(groupNetMinor, (net) => net > 0, (net) => net);
  sortByRemainingDescendingThenIndex(debtors);
  sortByRemainingDescendingThenIndex(creditors);

  const transfers: Transfer[] = [];
  let debtorPointer = 0;
  let creditorPointer = 0;

  while (debtorPointer < debtors.length && creditorPointer < creditors.length) {
    const debtor = requireEntry(debtors, debtorPointer);
    const creditor = requireEntry(creditors, creditorPointer);
    const amountMinor = Math.min(debtor.remainingMinor, creditor.remainingMinor);

    transfers.push({ fromIndex: debtor.index, toIndex: creditor.index, amountMinor });
    debtor.remainingMinor -= amountMinor;
    creditor.remainingMinor -= amountMinor;
    if (debtor.remainingMinor === 0) debtorPointer++;
    if (creditor.remainingMinor === 0) creditorPointer++;
  }

  return transfers;
}

function buildBalanceEntries(
  netMinor: readonly number[],
  predicate: (net: number) => boolean,
  toRemaining: (net: number) => number,
): BalanceEntry[] {
  return netMinor
    .map((net, index) => ({ net, index }))
    .filter(({ net }) => predicate(net))
    .map(({ net, index }) => ({ index, remainingMinor: toRemaining(net) }));
}

// Ties broken by lower participant index first, so the result is
// reproducible from the same input.
function sortByRemainingDescendingThenIndex(entries: BalanceEntry[]): void {
  entries.sort((a, b) => b.remainingMinor - a.remainingMinor || a.index - b.index);
}

function requireEntry(entries: readonly BalanceEntry[], index: number): BalanceEntry {
  const entry = entries[index];
  if (entry === undefined) {
    throw new Error(`computeSettlement: internal error, missing entry at index ${index}`);
  }
  return entry;
}
