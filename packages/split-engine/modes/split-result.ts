export type SplitWarning =
  | { readonly code: "under_allocated"; readonly remainingMinor: number }
  | { readonly code: "over_allocated"; readonly excessMinor: number }
  | { readonly code: "negative_share"; readonly indices: readonly number[] }
  | { readonly code: "unclaimed_items"; readonly itemIndices: readonly number[] }
  | { readonly code: "claim_weight_mismatch"; readonly itemIndices: readonly number[] }
  | { readonly code: "large_group_simplify"; readonly participantCount: number };

export interface SplitResult {
  readonly sharesMinor: readonly number[];
  readonly warnings: readonly SplitWarning[];
}
