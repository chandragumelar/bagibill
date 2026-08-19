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
  readonly netMinor: readonly number[];
  readonly perCharge: readonly ChargeBreakdown[];
  readonly treatTransfers: readonly TreatTransfer[];
  readonly perItem?: readonly ItemBreakdown[];
  readonly warnings: readonly SplitWarning[];
}
