import { calculateExpense } from "@bagibill/split-engine";
import { resolveMemberOrder, toCalculationInput } from "@/lib/storage/expense-mapping";
import type { ExpenseItemRecord, ExpenseRecord } from "@/lib/storage/records";

// Claiming an unclaimed item, or joining one two or more people already
// share, always gives weight 1 — spec.md 9's "share it" flow never invents
// a fractional weight, only splitByItems' largest-remainder math turns
// weights into money.
const SOLO_CLAIM_WEIGHT = 1;

function updateItem(
  items: readonly ExpenseItemRecord[],
  itemId: string,
  updater: (item: ExpenseItemRecord) => ExpenseItemRecord,
): readonly ExpenseItemRecord[] {
  return items.map((item) => (item.itemId === itemId ? updater(item) : item));
}

/** Adds memberId as a weight-1 claimant if not already claiming — idempotent. */
export function claimItem(
  items: readonly ExpenseItemRecord[],
  itemId: string,
  memberId: string,
): readonly ExpenseItemRecord[] {
  return updateItem(items, itemId, (item) => {
    if (item.claims.some((claim) => claim.memberId === memberId)) return item;
    return { ...item, claims: [...item.claims, { memberId, weight: SOLO_CLAIM_WEIGHT }] };
  });
}

/** Removes only memberId's own claim entry — every other claimant on the item is untouched. */
export function unclaimItem(
  items: readonly ExpenseItemRecord[],
  itemId: string,
  memberId: string,
): readonly ExpenseItemRecord[] {
  return updateItem(items, itemId, (item) => ({
    ...item,
    claims: item.claims.filter((claim) => claim.memberId !== memberId),
  }));
}

export type ClaimTapEffect =
  | { readonly kind: "claimed" }
  | { readonly kind: "released" }
  | { readonly kind: "joined" }
  | { readonly kind: "confirmShare"; readonly currentClaimantMemberId: string };

// What tapping an item should do, without mutating anything. An item held
// by exactly one other person needs a confirmation (spec.md 9.2: "Rina
// sudah klaim ini. Bagi berdua?") so a stray tap can't silently take over
// someone else's item — an item already shared by two or more people has
// already crossed that line, so one more joiner needs no confirmation.
export function resolveTapEffect(item: ExpenseItemRecord, memberId: string): ClaimTapEffect {
  const isMine = item.claims.some((claim) => claim.memberId === memberId);
  if (isMine) return { kind: "released" };
  if (item.claims.length === 0) return { kind: "claimed" };
  if (item.claims.length >= 2) return { kind: "joined" };
  const soleClaimant = item.claims[0];
  if (soleClaimant === undefined) return { kind: "claimed" };
  return { kind: "confirmShare", currentClaimantMemberId: soleClaimant.memberId };
}

export interface MyItemShare {
  readonly itemId: string;
  readonly name: string;
  readonly shareMinor: number;
  readonly claimantCount: number;
}

export interface MyShareSummary {
  readonly totalMinor: number;
  readonly items: readonly MyItemShare[];
}

// Reuses calculateExpense (the same save-time gate expenseRepository
// already runs, K-64) instead of re-deriving item math by hand, so the
// number shown here can never drift from what actually got saved —
// including any charge or treat layered on top of the per-item split.
export function computeMyShare(
  expense: ExpenseRecord,
  memberId: string,
  baseCurrency = expense.currency,
): MyShareSummary | undefined {
  const memberOrder = resolveMemberOrder(expense.splitData);
  const myIndex = memberOrder.indexOf(memberId);
  if (myIndex === -1) return undefined;

  const calculation = calculateExpense(toCalculationInput(expense, baseCurrency));
  const perItem = calculation.perItem ?? [];
  const items: MyItemShare[] = [];
  expense.items.forEach((item, itemIndex) => {
    const breakdown = perItem[itemIndex];
    const shareMinor = breakdown?.sharesMinor[myIndex] ?? 0;
    if (shareMinor <= 0) return;
    items.push({ itemId: item.itemId, name: item.name, shareMinor, claimantCount: item.claims.length });
  });

  return { totalMinor: calculation.sharesMinor[myIndex] ?? 0, items };
}
