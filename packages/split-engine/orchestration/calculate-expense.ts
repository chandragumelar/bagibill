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
  const balance = computeExpenseBalance({ sharesMinor: treatResult.sharesMinor, paymentsMinor });

  // Warnings are concatenated as-is, not deduplicated — each layer has its
  // own reason to raise one, and merging them would hide which layer a
  // warning came from.
  const warnings = [...splitOutcome.warnings, ...chargeResult.warnings, ...treatResult.warnings];

  return {
    sharesMinor: treatResult.sharesMinor,
    netMinor: balance.netMinor,
    perCharge: chargeResult.perCharge,
    treatTransfers: treatResult.transfers,
    perItem: splitOutcome.perItem,
    warnings,
  };
}

interface SplitOutcome {
  readonly sharesMinor: readonly number[];
  readonly warnings: readonly SplitWarning[];
  readonly perItem?: readonly ItemBreakdown[];
  readonly itemSharesMinor?: readonly (readonly number[])[];
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
