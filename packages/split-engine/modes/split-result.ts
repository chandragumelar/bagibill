export type SplitWarning =
  | { readonly code: "under_allocated"; readonly remainingMinor: number }
  | { readonly code: "over_allocated"; readonly excessMinor: number };

export interface SplitResult {
  readonly sharesMinor: readonly number[];
  readonly warnings: readonly SplitWarning[];
}
