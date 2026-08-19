import type { SplitWarning } from "../modes/split-result";

export type ChargeAmount =
  | { readonly kind: "fixed"; readonly amountMinor: number }
  | { readonly kind: "percent"; readonly percent: number; readonly basis: "subtotal" | "running_total" };

export type ChargeAllocation =
  | { readonly mode: "proportional" }
  | { readonly mode: "even" }
  | { readonly mode: "single_payer"; readonly participantIndex: number }
  | { readonly mode: "items"; readonly itemIndices: readonly number[] };

// The engine only knows amounts and allocation modes, never component names
// (tax, service, tip, shipping) — names, icons, and per-locale presets are a
// screen/i18n concern that changes on its own schedule, and baking a list of
// charge kinds in here would make the engine track something that has
// nothing to do with how the money is computed. One consequence: the order
// of the `charges` array is part of the contract, because a "running_total"
// basis is defined relative to the charges before it in that same array.
export interface ExtraCharge {
  readonly amount: ChargeAmount;
  readonly allocation: ChargeAllocation;
}

export interface ChargeBreakdown {
  readonly chargeTotalMinor: number;
  readonly sharesMinor: readonly number[];
}

export interface ExtraChargeResult {
  readonly totalSharesMinor: readonly number[];
  readonly perCharge: readonly ChargeBreakdown[];
  readonly chargesTotalMinor: number;
  readonly subtotalMinor: number;
  readonly warnings: readonly SplitWarning[];
}
