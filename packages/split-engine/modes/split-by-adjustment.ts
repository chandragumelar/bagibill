import { allocateByWeights } from "../allocation/allocate-by-weights";
import type { SplitResult, SplitWarning } from "./split-result";

const EVEN_WEIGHT = 1;

// Mode Selisih's own result: UI reads evenSharesMinor straight off here
// (the "Bagian rata" label, spec.md 6.5) instead of re-deriving it by
// subtracting adjustmentMinor from sharesMinor itself — that subtraction
// belongs to the engine, never to a component (CLAUDE.md: zero arithmetic
// in .tsx).
export interface AdjustmentSplitResult extends SplitResult {
  readonly evenSharesMinor: readonly number[];
}

export function splitByAdjustment(input: {
  totalMinor: number;
  adjustmentsMinor: readonly number[];
}): AdjustmentSplitResult {
  const { totalMinor, adjustmentsMinor } = input;
  assertIntegerTotal(totalMinor, adjustmentsMinor);
  assertValidAdjustments(adjustmentsMinor, totalMinor);

  // Adjustments are taken out of the total first, the remainder is split
  // evenly, then each person's own adjustment is added back. Splitting the
  // raw total evenly and adding adjustments on top would double count them
  // and break the sum-equals-total invariant.
  const sumAdjustmentsMinor = adjustmentsMinor.reduce((sum, adjustmentMinor) => sum + adjustmentMinor, 0);
  const baseTotalMinor = totalMinor - sumAdjustmentsMinor;
  const evenWeights = adjustmentsMinor.map(() => EVEN_WEIGHT);
  // allocateByWeights accepts a negative totalMinor (K-25) and still
  // distributes it via largest remainder — needed below, since adjustments
  // summing past the total is a warned state, not a thrown one.
  const evenSharesMinor = allocateByWeights({ totalMinor: baseTotalMinor, weights: evenWeights });

  const sharesMinor = applyAdjustments(evenSharesMinor, adjustmentsMinor);
  const warnings = [...buildAdjustmentExceedsTotalWarnings(baseTotalMinor), ...buildNegativeShareWarnings(sharesMinor)];

  return { sharesMinor, evenSharesMinor, warnings };
}

// spec.md 6.5: adjustments may exceed the total — computed anyway, never
// thrown, so the draft stays editable. The UI blocks *saving* on this
// warning (same pattern as byAmounts' hasAllocationMismatchWarning).
function buildAdjustmentExceedsTotalWarnings(baseTotalMinor: number): SplitWarning[] {
  if (baseTotalMinor >= 0) return [];
  return [{ code: "adjustment_exceeds_total", shortfallMinor: -baseTotalMinor }];
}

// allocateByWeights returns one share per weight, so evenSharesMinor is always
// the same length as adjustmentsMinor — the undefined check below is
// unreachable in practice, required only to satisfy noUncheckedIndexedAccess.
function applyAdjustments(evenSharesMinor: readonly number[], adjustmentsMinor: readonly number[]): number[] {
  return adjustmentsMinor.map((adjustmentMinor, index) => {
    const evenShareMinor = evenSharesMinor[index];
    if (evenShareMinor === undefined) {
      throw new Error(`splitByAdjustment: internal error, missing even share at index ${index}`);
    }
    return evenShareMinor + adjustmentMinor;
  });
}

function buildNegativeShareWarnings(sharesMinor: readonly number[]): SplitWarning[] {
  const indices = sharesMinor
    .map((shareMinor, index) => ({ shareMinor, index }))
    .filter(({ shareMinor }) => shareMinor < 0)
    .map(({ index }) => index);

  return indices.length === 0 ? [] : [{ code: "negative_share", indices }];
}

function splitByAdjustmentError(reason: string, totalMinor: number, adjustmentsMinor: readonly number[]): Error {
  return new Error(
    `splitByAdjustment: ${reason} (totalMinor=${totalMinor}, adjustmentsMinor=[${adjustmentsMinor.join(", ")}])`,
  );
}

function assertIntegerTotal(totalMinor: number, adjustmentsMinor: readonly number[]): void {
  if (Number.isInteger(totalMinor)) return;
  throw splitByAdjustmentError(`totalMinor must be an integer, got ${totalMinor}`, totalMinor, adjustmentsMinor);
}

function assertValidAdjustments(adjustmentsMinor: readonly number[], totalMinor: number): void {
  if (adjustmentsMinor.length === 0) {
    throw splitByAdjustmentError("cannot split among zero participants", totalMinor, adjustmentsMinor);
  }
  for (const adjustmentMinor of adjustmentsMinor) {
    if (!Number.isInteger(adjustmentMinor)) {
      throw splitByAdjustmentError(
        `adjustmentMinor ${adjustmentMinor} must be an integer`,
        totalMinor,
        adjustmentsMinor,
      );
    }
  }
}
