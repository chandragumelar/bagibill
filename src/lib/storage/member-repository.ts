import type { BagiBillDatabase } from "./schema";
import type { Clock } from "./clock";
import type { IdGenerator } from "./id";
import type { ExpenseRecord, MemberRecord, SettlementRecord, TreatRecord } from "./records";

// spec.md 18.5 / K-07: 12 identity colors, assigned in order so the same
// group always produces the same colors, member 13 wraps back to --m-1.
// Storage keeps the CSS custom property name ("--m-1"), the same shape the
// F2-01 schema test already used for MemberRecord.color — the actual hex
// value stays owned by packages/tokens, never duplicated here.
const MEMBER_PALETTE_SIZE = 12;

export interface AddMemberInput {
  readonly groupSlug: string;
  readonly name: string;
}

export interface ListMembersOptions {
  readonly includeInactive?: boolean;
}

export interface MemberRepository {
  addMember(input: AddMemberInput): Promise<MemberRecord>;
  listMembers(groupSlug: string, options?: ListMembersOptions): Promise<readonly MemberRecord[]>;
  renameMember(memberId: string, name: string): Promise<void>;
  deactivateMember(memberId: string): Promise<void>;
  reactivateMember(memberId: string): Promise<void>;
  deleteMember(memberId: string): Promise<void>;
}

function treatReferencesMember(treat: TreatRecord, memberId: string): boolean {
  if (treat.kind === "item") {
    return treat.sponsorMemberId === memberId;
  }
  return treat.sponsorMemberId === memberId || treat.beneficiaryMemberId === memberId;
}

// splitData's per-mode shape isn't designed yet (deferred to F2-03, see
// records.ts), so it can't be checked field by field. This walks the
// unknown value looking for the memberId anywhere in it — a generic
// fallback until F2-03 gives splitData a real shape to check precisely.
function splitDataReferencesMember(splitData: unknown, memberId: string): boolean {
  if (typeof splitData === "string") {
    return splitData === memberId;
  }
  if (Array.isArray(splitData)) {
    return splitData.some((entry) => splitDataReferencesMember(entry, memberId));
  }
  if (splitData !== null && typeof splitData === "object") {
    return Object.values(splitData).some((value) => splitDataReferencesMember(value, memberId));
  }
  return false;
}

function expenseReferencesMember(expense: ExpenseRecord, memberId: string): boolean {
  const isPayer = expense.payers.some((payer) => payer.memberId === memberId);
  const isItemClaimant = expense.items.some((item) =>
    item.claims.some((claim) => claim.memberId === memberId),
  );
  const isTreatParty = expense.treats.some((treat) => treatReferencesMember(treat, memberId));
  const isInSplitData = splitDataReferencesMember(expense.splitData, memberId);
  return isPayer || isItemClaimant || isTreatParty || isInSplitData;
}

function settlementReferencesMember(settlement: SettlementRecord, memberId: string): boolean {
  return settlement.fromMemberId === memberId || settlement.toMemberId === memberId;
}

// Same injection reasoning as group-repository.ts.
export function createMemberRepository(
  db: BagiBillDatabase,
  clock: Clock,
  idGenerator: IdGenerator,
): MemberRepository {
  async function addMember(input: AddMemberInput): Promise<MemberRecord> {
    // Counts every member ever added to the group, including deactivated
    // and soft-deleted ones — spec.md 18.5 says a color is fixed for life,
    // so counting only active members would eventually hand the same color
    // to two different people in the same group's history.
    const historicalCount = await db.members.where("groupSlug").equals(input.groupSlug).count();
    const colorNumber = (historicalCount % MEMBER_PALETTE_SIZE) + 1;
    const member: MemberRecord = {
      memberId: idGenerator.nextId(),
      groupSlug: input.groupSlug,
      name: input.name,
      color: `--m-${colorNumber}`,
      joinedAt: clock.now(),
      seq: 0,
    };
    await db.members.add(member);
    return member;
  }

  async function listMembers(
    groupSlug: string,
    options: ListMembersOptions = {},
  ): Promise<readonly MemberRecord[]> {
    const members = await db.members.where("groupSlug").equals(groupSlug).toArray();
    const notDeleted = members.filter((member) => member.deletedAt === undefined);
    if (options.includeInactive === true) {
      return notDeleted;
    }
    return notDeleted.filter((member) => member.deactivatedAt === undefined);
  }

  async function renameMember(memberId: string, name: string): Promise<void> {
    // Color and memberId are untouched — spec.md 18.5 fixes the color for
    // life, a rename is not a re-join.
    await db.members.update(memberId, { name });
  }

  async function deactivateMember(memberId: string): Promise<void> {
    await db.members.update(memberId, { deactivatedAt: clock.now() });
  }

  async function reactivateMember(memberId: string): Promise<void> {
    await db.members.update(memberId, { deactivatedAt: undefined });
  }

  async function deleteMember(memberId: string): Promise<void> {
    const member = await db.members.get(memberId);
    if (member === undefined) {
      throw new Error("deleteMember: no member found for the given id");
    }
    const expenses = await db.expenses.where("groupSlug").equals(member.groupSlug).toArray();
    const settlements = await db.settlements.where("groupSlug").equals(member.groupSlug).toArray();
    const hasTransaction =
      expenses.some((expense) => expenseReferencesMember(expense, memberId)) ||
      settlements.some((settlement) => settlementReferencesMember(settlement, memberId));

    if (hasTransaction) {
      throw new Error(
        "deleteMember: member already has recorded transactions (payer, item claimant, split " +
          "participant, treat party, or settlement) — deactivate the member instead of deleting them",
      );
    }
    await db.members.update(memberId, { deletedAt: clock.now() });
  }

  return { addMember, listMembers, renameMember, deactivateMember, reactivateMember, deleteMember };
}
