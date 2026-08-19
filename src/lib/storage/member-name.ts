import type { MemberRecord } from "./records";

const WHITESPACE_PATTERN = /\s+/g;
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;

// spec.md 12.2: "dimas", "Dimas ", and "DIMAS" must normalize the same way.
export function normalizeMemberName(raw: string): string {
  return raw
    .trim()
    .replace(WHITESPACE_PATTERN, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS_PATTERN, "");
}

// spec.md 12.2 only says "cukup mirip" without a number. One edit distance
// is the K-decision: it catches a one-letter typo ("Dimas" vs "Dimass")
// without dragging in a genuinely different name ("Dimas" vs "Dinar").
const MAX_SIMILAR_DISTANCE = 1;

function requireDefined<T>(value: T | undefined, context: string): T {
  if (value === undefined) {
    throw new Error(`levenshteinDistance: unexpected undefined ${context}`);
  }
  return value;
}

// Iterative edit-distance, no library: one row of the DP matrix at a time.
function levenshteinDistance(source: string, target: string): number {
  let previousRow = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let i = 1; i <= source.length; i += 1) {
    const currentRow = [i];
    const sourceChar = requireDefined(source[i - 1], "source char");
    for (let j = 1; j <= target.length; j += 1) {
      const targetChar = requireDefined(target[j - 1], "target char");
      const substitutionCost = sourceChar === targetChar ? 0 : 1;
      const deletionCost = requireDefined(previousRow[j], "previous row") + 1;
      const insertionCost = requireDefined(currentRow[j - 1], "current row") + 1;
      const substitutionTotal = requireDefined(previousRow[j - 1], "previous diagonal") + substitutionCost;
      currentRow.push(Math.min(deletionCost, insertionCost, substitutionTotal));
    }
    previousRow = currentRow;
  }

  return requireDefined(previousRow[target.length], "final distance");
}

// Pure and deliberately has no authority to reject anything: spec.md 12.2 is
// explicit that an exact-duplicate name is still allowed if the user
// chooses to proceed — what's forbidden is creating one unknowingly. So
// this only ever returns candidates for a screen to warn about; callers
// (including addMember) must never use it to block a write.
export function findSimilarMembers(
  candidate: string,
  existing: readonly MemberRecord[],
): readonly MemberRecord[] {
  const normalizedCandidate = normalizeMemberName(candidate);
  return existing.filter((member) => {
    const normalizedExisting = normalizeMemberName(member.name);
    return levenshteinDistance(normalizedCandidate, normalizedExisting) <= MAX_SIMILAR_DISTANCE;
  });
}
