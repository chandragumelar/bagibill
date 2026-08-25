import { resolveMemberOrder } from "@/lib/storage/expense-mapping";
import { findSimilarMembers } from "@/lib/storage/member-name";
import type { ExpenseRecord, MemberRecord, SettlementRecord } from "@/lib/storage/records";

// Mockup dev-note (Buat_Grup___Kelola_Member.html): "Farhan Maulana
// Abdurrahman → FM (dua kata pertama), bukan Fa." — first two words, not
// first+last. BalanceList.tsx/use-group-detail.ts/IdentityPicker.tsx all
// carry a first+last initialsFromName that gives "FA" for that same name;
// this mockup is the first place the 3-word case was actually specified,
// so those three copies are bugged against CLAUDE.md's own rule ("Inisial
// avatar diambil dari kata") and should converge on this version later —
// out of scope here (all three files are outside src/features/group/).
export function initialsFromTwoWords(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

// Approximates member-repository.ts's private hasTransaction check (which
// isn't exported, and member-repository.ts is out of this task's scope) —
// close enough for display and for pre-flight branching between
// LockedActionExplain and DangerSheet. resolveMemberOrder already covers
// every split mode's full participant list, including byItems (K-42);
// what it doesn't distinguish is "claimed an item" vs "just a byItems
// participant", which is fine here since deleteMember's own authoritative
// check runs for real when a delete is actually confirmed — this count
// only decides which sheet to show first, it never gates the write itself.
function expenseInvolvesMember(expense: ExpenseRecord, memberId: string): boolean {
  if (expense.payers.some((payer) => payer.memberId === memberId)) return true;
  try {
    return resolveMemberOrder(expense.splitData).includes(memberId);
  } catch {
    return false;
  }
}

export function memberTransactionCount(
  memberId: string,
  expenses: readonly ExpenseRecord[],
  settlements: readonly SettlementRecord[],
): number {
  const expenseCount = expenses.filter((expense) => expenseInvolvesMember(expense, memberId)).length;
  const settlementCount = settlements.filter(
    (settlement) => settlement.fromMemberId === memberId || settlement.toMemberId === memberId,
  ).length;
  return expenseCount + settlementCount;
}

// findSimilarMembers (K-57) takes real MemberRecord[] because it's built
// for the post-creation "add a member" path, where the comparison set is
// already persisted. During group creation there's no groupSlug yet — the
// draft member list is plain names in memory — so this wraps each draft
// name in the minimum valid MemberRecord shape findSimilarMembers needs to
// read `.name`, purely to reuse that function's normalize+distance logic
// rather than duplicating it (K-57 explicitly reserves that logic to one
// place). None of the placeholder fields below are ever read or rendered.
export function findSimilarDraftNames(candidate: string, existingNames: readonly string[]): readonly string[] {
  const comparable: readonly MemberRecord[] = existingNames.map((name, index) => ({
    memberId: `draft-${index}`,
    groupSlug: "",
    name,
    color: "",
    joinedAt: 0,
    seq: 0,
  }));
  return findSimilarMembers(candidate, comparable).map((member) => member.name);
}
