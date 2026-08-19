import type { SplitWarning } from "./split-result";

export interface ItemClaim {
  readonly participantIndex: number;
  readonly weight: number;
}

export interface ExpenseItem {
  readonly unitPriceMinor: number;
  readonly quantity: number;
  readonly claims: readonly ItemClaim[];
}

export interface ItemBreakdown {
  readonly itemTotalMinor: number;
  readonly sharesMinor: readonly number[];
  readonly isUnclaimed: boolean;
  readonly hasWeightMismatch: boolean;
}

export interface ItemSplitResult {
  readonly sharesMinor: readonly number[];
  readonly perItem: readonly ItemBreakdown[];
  readonly unclaimedTotalMinor: number;
  readonly totalMinor: number;
  readonly warnings: readonly SplitWarning[];
}
