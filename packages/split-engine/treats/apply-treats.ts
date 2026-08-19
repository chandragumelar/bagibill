import type { SplitWarning } from "../modes/split-result";
import { assertValidInput } from "./treat-validation";
import { processTreats } from "./treat-transfer";
import type { Treat, TreatResult } from "./treat.types";

export function applyTreats(input: {
  sharesMinor: readonly number[];
  treats: readonly Treat[];
  itemSharesMinor?: readonly (readonly number[])[];
}): TreatResult {
  const { sharesMinor, treats, itemSharesMinor } = input;
  assertValidInput(sharesMinor, treats, itemSharesMinor);

  const { finalSharesMinor, transfers } = processTreats(sharesMinor, treats, itemSharesMinor);
  const warnings = buildNegativeShareWarnings(finalSharesMinor);

  return { sharesMinor: finalSharesMinor, transfers, warnings };
}

function buildNegativeShareWarnings(sharesMinor: readonly number[]): SplitWarning[] {
  const indices = sharesMinor
    .map((shareMinor, index) => ({ shareMinor, index }))
    .filter(({ shareMinor }) => shareMinor < 0)
    .map(({ index }) => index);

  return indices.length === 0 ? [] : [{ code: "negative_share", indices }];
}
