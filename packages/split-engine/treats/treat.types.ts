import type { SplitWarning } from "../modes/split-result";

// No "component" variant here even though spec.md 7.4 describes three
// levels and component is the first one ("pajaknya dari saya"). That's
// deliberate: sponsoring a single charge is already exactly the
// single_payer allocation mode built in F1-06 (charges/extra-charge.types.ts).
// Adding a component variant here would mean two code paths for the same
// behavior, and two code paths for the same thing is the fastest way to get
// two screens showing different numbers.
export type Treat =
  | { readonly kind: "person"; readonly sponsorIndex: number; readonly beneficiaryIndex: number }
  | {
      readonly kind: "partial";
      readonly sponsorIndex: number;
      readonly beneficiaryIndex: number;
      readonly amountMinor: number;
    }
  | { readonly kind: "item"; readonly sponsorIndex: number; readonly itemIndices: readonly number[] };

export interface TreatTransfer {
  readonly sponsorIndex: number;
  readonly beneficiaryIndex: number;
  readonly amountMinor: number;
}

export interface TreatResult {
  readonly sharesMinor: readonly number[];
  readonly transfers: readonly TreatTransfer[];
  readonly warnings: readonly SplitWarning[];
}
