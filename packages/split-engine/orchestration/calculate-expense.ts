import { allocateExtraCharges } from "../charges/allocate-extra-charges";
import type { ExtraCharge, ExtraChargeResult } from "../charges/extra-charge.types";
import { splitByAdjustment } from "../modes/split-by-adjustment";
import { splitByAmounts } from "../modes/split-by-amounts";
import { splitByItems } from "../modes/split-by-items";
import { splitByPercentage } from "../modes/split-by-percentage";
import { splitByWeights } from "../modes/split-by-weights";
import { splitEvenly } from "../modes/split-evenly";
import type { ItemBreakdown } from "../modes/split-by-items.types";
import type { SplitWarning } from "../modes/split-result";
import { applyTreats } from "../treats/apply-treats";
import type { Treat, TreatResult } from "../treats/treat.types";
import { computeExpenseBalance } from "../balance/compute-balances";
import type { ExpenseCalculation, SplitInput } from "./expense.types";

export function calculateExpense(input: {
  totalMinor: number;
  split: SplitInput;
  charges?: readonly ExtraCharge[];
  treats?: readonly Treat[];
  paymentsMinor: readonly number[];
}): ExpenseCalculation {
  const { totalMinor, split, paymentsMinor } = input;
  const charges = input.charges ?? [];
  const treats = input.treats ?? [];
  assertPositiveTotal(totalMinor);
  assertItemModeAllowed(split, charges, treats);

  // Layer order is a contract: split, then charges, then treats, then
  // balance — every layer already assumes the one before it has run, and
  // reversing the order makes the numbers wrong without throwing an error.
  const splitOutcome = runSplit(totalMinor, split);
  const chargeResult = runCharges(splitOutcome.sharesMinor, charges, splitOutcome.itemSharesMinor);
  const treatResult = runTreats(chargeResult.totalSharesMinor, treats, splitOutcome.itemSharesMinor);
  const balanceOutcome = resolveBalance(treatResult.sharesMinor, paymentsMinor);

  // Warnings are concatenated as-is, not deduplicated — each layer has its
  // own reason to raise one, and merging them would hide which layer a
  // warning came from.
  const warnings = [...splitOutcome.warnings, ...chargeResult.warnings, ...treatResult.warnings, ...balanceOutcome.warnings];

  return {
    sharesMinor: treatResult.sharesMinor,
    netMinor: balanceOutcome.netMinor,
    perCharge: chargeResult.perCharge,
    treatTransfers: treatResult.transfers,
    perItem: splitOutcome.perItem,
    unclaimedTotalMinor: splitOutcome.unclaimedTotalMinor,
    warnings,
  };
}

interface BalanceOutcome {
  readonly netMinor: readonly number[] | null;
  readonly warnings: readonly SplitWarning[];
}

// K-122: mirrors compute-balances.ts's own structural guards (non-empty,
// matching lengths, integer/non-negative elements) so those still throw
// exactly as before — only the total-mismatch check itself moves out of
// computeExpenseBalance and into a warning here. computeExpenseBalance
// (K-43) is untouched and still throws for anyone who calls it directly.
function assertBalanceInputsWellFormed(sharesMinor: readonly number[], paymentsMinor: readonly number[]): void {
  if (sharesMinor.length === 0 || paymentsMinor.length === 0) {
    throw calculateExpenseError("sharesMinor and paymentsMinor must not be empty");
  }
  if (sharesMinor.length !== paymentsMinor.length) {
    throw calculateExpenseError(
      `sharesMinor length ${sharesMinor.length} does not match paymentsMinor length ${paymentsMinor.length}`,
    );
  }
  sharesMinor.forEach((shareMinor, index) => {
    if (!Number.isInteger(shareMinor)) {
      throw calculateExpenseError(`sharesMinor[${index}] ${shareMinor} must be an integer`);
    }
  });
  paymentsMinor.forEach((paymentMinor, index) => {
    if (!Number.isInteger(paymentMinor)) {
      throw calculateExpenseError(`paymentsMinor[${index}] ${paymentMinor} must be an integer`);
    }
    if (paymentMinor < 0) {
      throw calculateExpenseError(`paymentsMinor[${index}] ${paymentMinor} must not be negative`);
    }
  });
}

// "Can this be computed" (structural sanity) and "is it balanced" (shares
// sum to payments) are two different questions (K-122) — an expense mid-claim,
// where some items nobody has claimed yet, is valid and storable (K-31), not
// corrupt. Only the totals-mismatch case downgrades from a thrown error to a
// warning; every structural check above still throws unconditionally.
function resolveBalance(sharesMinor: readonly number[], paymentsMinor: readonly number[]): BalanceOutcome {
  assertBalanceInputsWellFormed(sharesMinor, paymentsMinor);
  const totalSharesMinor = sumMinor(sharesMinor);
  const totalPaymentsMinor = sumMinor(paymentsMinor);
  if (totalSharesMinor !== totalPaymentsMinor) {
    const differenceMinor = totalSharesMinor - totalPaymentsMinor;
    return { netMinor: null, warnings: [{ code: "unbalanced_payments", differenceMinor }] };
  }
  const balance = computeExpenseBalance({ sharesMinor, paymentsMinor });
  return { netMinor: balance.netMinor, warnings: [] };
}

interface SplitOutcome {
  readonly sharesMinor: readonly number[];
  readonly warnings: readonly SplitWarning[];
  readonly perItem?: readonly ItemBreakdown[];
  readonly itemSharesMinor?: readonly (readonly number[])[];
  readonly unclaimedTotalMinor?: number;
}

function runSplit(totalMinor: number, split: SplitInput): SplitOutcome {
  switch (split.mode) {
    case "evenly": {
      const result = splitEvenly({ totalMinor, participantCount: split.participantCount });
      return { sharesMinor: result.sharesMinor, warnings: result.warnings };
    }
    case "byAmounts": {
      const result = splitByAmounts({ totalMinor, amountsMinor: split.amountsMinor });
      return { sharesMinor: result.sharesMinor, warnings: result.warnings };
    }
    case "byPercentage": {
      const result = splitByPercentage({ totalMinor, percentages: split.percentages });
      return { sharesMinor: result.sharesMinor, warnings: result.warnings };
    }
    case "byWeights": {
      const result = splitByWeights({ totalMinor, weights: split.weights });
      return { sharesMinor: result.sharesMinor, warnings: result.warnings };
    }
    case "byAdjustment": {
      const result = splitByAdjustment({ totalMinor, adjustmentsMinor: split.adjustmentsMinor });
      return { sharesMinor: result.sharesMinor, warnings: result.warnings };
    }
    case "byItems": {
      const result = splitByItems({ participantCount: split.participantCount, items: split.items });
      assertItemTotalMatches(totalMinor, result.totalMinor);
      return {
        sharesMinor: result.sharesMinor,
        warnings: result.warnings,
        perItem: result.perItem,
        itemSharesMinor: result.perItem.map((item) => item.sharesMinor),
        unclaimedTotalMinor: result.unclaimedTotalMinor,
      };
    }
  }
}

function runCharges(
  baseSharesMinor: readonly number[],
  charges: readonly ExtraCharge[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): ExtraChargeResult {
  if (charges.length === 0) {
    return {
      totalSharesMinor: baseSharesMinor,
      perCharge: [],
      chargesTotalMinor: 0,
      subtotalMinor: sumMinor(baseSharesMinor),
      warnings: [],
    };
  }
  return allocateExtraCharges({ baseSharesMinor, charges, itemSharesMinor });
}

function runTreats(
  sharesMinor: readonly number[],
  treats: readonly Treat[],
  itemSharesMinor: readonly (readonly number[])[] | undefined,
): TreatResult {
  if (treats.length === 0) {
    return { sharesMinor, transfers: [], warnings: [] };
  }
  return applyTreats({ sharesMinor, treats, itemSharesMinor });
}

function sumMinor(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

// spec.md 24: a stored expense's total must be positive. The engine layers
// underneath (allocateByWeights et al.) deliberately accept a negative
// totalMinor (K-25) because discounts and corrections need it — but that's
// an internal allocation primitive, not a product rule. This is where the
// product rule belongs: discounts enter through `charges` as a negative
// amount, never through the expense's own total.
function assertPositiveTotal(totalMinor: number): void {
  if (!Number.isInteger(totalMinor) || totalMinor <= 0) {
    throw calculateExpenseError(`totalMinor must be a positive integer, got ${totalMinor}`);
  }
}

// byItems derives its own total from the items (K-31) — the caller's
// totalMinor is only cross-checked here, never used to drive the split,
// otherwise a contradicting number could silently win.
function assertItemTotalMatches(totalMinor: number, itemsTotalMinor: number): void {
  if (totalMinor !== itemsTotalMinor) {
    throw calculateExpenseError(
      `totalMinor ${totalMinor} does not match the sum of item totals ${itemsTotalMinor} for split mode "byItems"`,
    );
  }
}

function assertItemModeAllowed(
  split: SplitInput,
  charges: readonly ExtraCharge[],
  treats: readonly Treat[],
): void {
  if (split.mode === "byItems") return;

  const hasItemsCharge = charges.some((charge) => charge.allocation.mode === "items");
  if (hasItemsCharge) {
    throw calculateExpenseError(
      `charge allocation mode "items" requires split mode "byItems", got "${split.mode}"`,
    );
  }
  const hasItemTreat = treats.some((treat) => treat.kind === "item");
  if (hasItemTreat) {
    throw calculateExpenseError(`treat kind "item" requires split mode "byItems", got "${split.mode}"`);
  }
}

function calculateExpenseError(reason: string): Error {
  return new Error(`calculateExpense: ${reason}`);
}
