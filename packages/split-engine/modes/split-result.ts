export type SplitWarning =
  | { readonly code: "under_allocated"; readonly remainingMinor: number }
  | { readonly code: "over_allocated"; readonly excessMinor: number }
  | { readonly code: "negative_share"; readonly indices: readonly number[] }
  | { readonly code: "unclaimed_items"; readonly itemIndices: readonly number[] }
  | { readonly code: "claim_weight_mismatch"; readonly itemIndices: readonly number[] }
  | { readonly code: "large_group_simplify"; readonly participantCount: number }
  // K-122: total shares minus total payments — sign says which direction is
  // off. calculateExpense raises this instead of throwing when the two
  // don't match, since "not yet balanced" (e.g. an item nobody has claimed
  // yet) is valid, storable data (K-31), not corrupt data (K-43 still
  // throws for anyone who calls computeExpenseBalance directly).
  | { readonly code: "unbalanced_payments"; readonly differenceMinor: number };

export interface SplitResult {
  readonly sharesMinor: readonly number[];
  readonly warnings: readonly SplitWarning[];
}
