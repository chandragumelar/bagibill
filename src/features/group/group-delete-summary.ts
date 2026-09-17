import { computeGroupBalanceState } from "@/features/settle";
import type { ExpenseRecord, GroupRecord, MemberRecord, SettlementRecord } from "@/lib/storage/records";

export interface GroupDeleteSummary {
  readonly expenseCount: number;
  readonly settlementCount: number;
  readonly outstandingMemberCount: number;
}

interface GroupDeleteSummaryInput {
  readonly group: GroupRecord;
  readonly members: readonly MemberRecord[];
  readonly expenses: readonly ExpenseRecord[];
  readonly settlements: readonly SettlementRecord[];
}

// Reuses group-balance's single calculation path. Deleting a group must not
// introduce another balance calculation only to produce confirmation copy.
export function buildGroupDeleteSummary({
  group,
  members,
  expenses,
  settlements,
}: GroupDeleteSummaryInput): GroupDeleteSummary {
  const balance = computeGroupBalanceState(group, members, expenses, settlements, () => {});
  let outstandingMemberCount = 0;
  if (balance.status === "ready") {
    outstandingMemberCount = balance.rows.filter((member) => member.netMinor !== 0).length;
  }
  return {
    expenseCount: expenses.length,
    settlementCount: settlements.length,
    outstandingMemberCount,
  };
}
