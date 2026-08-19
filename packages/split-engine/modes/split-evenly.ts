import { allocateByWeights } from "../allocation/allocate-by-weights";
import type { SplitResult } from "./split-result";

const EVEN_WEIGHT = 1;

export function splitEvenly(input: { totalMinor: number; participantCount: number }): SplitResult {
  const { totalMinor, participantCount } = input;
  assertIntegerTotal(totalMinor, participantCount);
  assertValidParticipantCount(participantCount, totalMinor);

  const weights = Array.from({ length: participantCount }, () => EVEN_WEIGHT);
  const sharesMinor = allocateByWeights({ totalMinor, weights });

  return { sharesMinor, warnings: [] };
}

function splitEvenlyError(reason: string, totalMinor: number, participantCount: number): Error {
  return new Error(`splitEvenly: ${reason} (totalMinor=${totalMinor}, participantCount=${participantCount})`);
}

function assertIntegerTotal(totalMinor: number, participantCount: number): void {
  if (Number.isInteger(totalMinor)) return;
  throw splitEvenlyError(`totalMinor must be an integer, got ${totalMinor}`, totalMinor, participantCount);
}

function assertValidParticipantCount(participantCount: number, totalMinor: number): void {
  if (!Number.isInteger(participantCount) || participantCount <= 0) {
    throw splitEvenlyError(
      `participantCount must be a positive integer, got ${participantCount}`,
      totalMinor,
      participantCount,
    );
  }
}
