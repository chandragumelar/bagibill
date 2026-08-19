import type { SplitResult, SplitWarning } from "./split-result";

export function splitByAmounts(input: { totalMinor: number; amountsMinor: readonly number[] }): SplitResult {
  const { totalMinor, amountsMinor } = input;
  assertIntegerTotal(totalMinor, amountsMinor);
  assertValidAmounts(amountsMinor, totalMinor);

  const sharesMinor = [...amountsMinor];
  const warnings = buildWarnings(totalMinor, amountsMinor);

  return { sharesMinor, warnings };
}

function buildWarnings(totalMinor: number, amountsMinor: readonly number[]): SplitWarning[] {
  const allocatedMinor = amountsMinor.reduce((sum, amountMinor) => sum + amountMinor, 0);
  const differenceMinor = totalMinor - allocatedMinor;

  if (differenceMinor > 0) {
    return [{ code: "under_allocated", remainingMinor: differenceMinor }];
  }
  if (differenceMinor < 0) {
    return [{ code: "over_allocated", excessMinor: -differenceMinor }];
  }
  return [];
}

function splitByAmountsError(reason: string, totalMinor: number, amountsMinor: readonly number[]): Error {
  return new Error(`splitByAmounts: ${reason} (totalMinor=${totalMinor}, amountsMinor=[${amountsMinor.join(", ")}])`);
}

function assertIntegerTotal(totalMinor: number, amountsMinor: readonly number[]): void {
  if (Number.isInteger(totalMinor)) return;
  throw splitByAmountsError(`totalMinor must be an integer, got ${totalMinor}`, totalMinor, amountsMinor);
}

function assertValidAmounts(amountsMinor: readonly number[], totalMinor: number): void {
  if (amountsMinor.length === 0) {
    throw splitByAmountsError("amountsMinor must not be empty", totalMinor, amountsMinor);
  }
  for (const amountMinor of amountsMinor) {
    if (!Number.isInteger(amountMinor)) {
      throw splitByAmountsError(`amountMinor ${amountMinor} must be an integer`, totalMinor, amountsMinor);
    }
    // Negative per-person amounts belong to the Selisih mode (F1-04), a
    // negative here almost always means a typo, not an intentional discount.
    if (amountMinor < 0) {
      throw splitByAmountsError(`amountMinor ${amountMinor} must not be negative`, totalMinor, amountsMinor);
    }
  }
}
