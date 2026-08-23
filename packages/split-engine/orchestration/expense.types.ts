import type { ChargeBreakdown } from "../charges/extra-charge.types";
import type { ExpenseItem, ItemBreakdown } from "../modes/split-by-items.types";
import type { SplitWarning } from "../modes/split-result";
import type { TreatTransfer } from "../treats/treat.types";

export type SplitInput =
  | { readonly mode: "evenly"; readonly participantCount: number }
  | { readonly mode: "byAmounts"; readonly amountsMinor: readonly number[] }
  | { readonly mode: "byPercentage"; readonly percentages: readonly number[] }
  | { readonly mode: "byWeights"; readonly weights: readonly number[] }
  | { readonly mode: "byAdjustment"; readonly adjustmentsMinor: readonly number[] }
  | { readonly mode: "byItems"; readonly participantCount: number; readonly items: readonly ExpenseItem[] };

export interface ExpenseCalculation {
  readonly sharesMinor: readonly number[];
  /** null when total shares don't yet equal total payments (K-122) — a real, storable state, not an error. Carries an `unbalanced_payments` warning instead. */
  readonly netMinor: readonly number[] | null;
  readonly perCharge: readonly ChargeBreakdown[];
  readonly treatTransfers: readonly TreatTransfer[];
  readonly perItem?: readonly ItemBreakdown[];
  /** byItems only (K-122) — the total of items nobody has claimed yet, straight from splitByItems's own count, never recomputed. */
  readonly unclaimedTotalMinor?: number;
  readonly warnings: readonly SplitWarning[];
}
