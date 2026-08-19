import { allocateByWeights } from "../allocation/allocate-by-weights";
import type { SplitResult } from "./split-result";

export function splitByWeights(input: { totalMinor: number; weights: readonly number[] }): SplitResult {
  const { totalMinor, weights } = input;
  assertNonEmptyWeights(weights, totalMinor);

  // Wrapped into SplitResult, not returned as a bare number[], so the add-expense
  // screen and the balance screen render every mode from the same shape (CLAUDE.md).
  const sharesMinor = allocateByWeights({ totalMinor, weights });

  return { sharesMinor, warnings: [] };
}

function splitByWeightsError(reason: string, totalMinor: number, weights: readonly number[]): Error {
  return new Error(`splitByWeights: ${reason} (totalMinor=${totalMinor}, weights=[${weights.join(", ")}])`);
}

function assertNonEmptyWeights(weights: readonly number[], totalMinor: number): void {
  if (weights.length === 0) {
    throw splitByWeightsError("cannot split among zero participants", totalMinor, weights);
  }
}
