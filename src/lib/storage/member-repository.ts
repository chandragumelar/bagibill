import type { StorageAdapter } from "./adapter";
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

// splitData now has a real per-mode shape (F2-03, records.ts), but this
// walk stays generic rather than switching on splitData.mode — it's cheap,
// it already covers every mode without a switch to keep in sync, and the
// id space is random and opaque so a generic string scan can't false-match.
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
  adapter: StorageAdapter,
  clock: Clock,
  idGenerator: IdGenerator,
): MemberRepository {
  async function addMember(input: AddMemberInput): Promise<MemberRecord> {
    // Counts every member ever added to the group, including deactivated
    // and soft-deleted ones — spec.md 18.5 says a color is fixed for life,
    // so counting only active members would eventually hand the same color
    // to two different people in the same group's history.
    const historicalMembers = await adapter.members.findBy("groupSlug", input.groupSlug);
    const colorNumber = (historicalMembers.length % MEMBER_PALETTE_SIZE) + 1;
    const member: MemberRecord = {
      memberId: idGenerator.nextId(),
      groupSlug: input.groupSlug,
      name: input.name,
      color: `--m-${colorNumber}`,
      joinedAt: clock.now(),
      seq: 0,
    };
    await adapter.members.put(member);
    return member;
  }

  async function listMembers(
    groupSlug: string,
    options: ListMembersOptions = {},
  ): Promise<readonly MemberRecord[]> {
    const members = await adapter.members.findBy("groupSlug", groupSlug);
    const notDeleted = members.filter((member) => member.deletedAt === undefined);
    if (options.includeInactive === true) {
      return notDeleted;
    }
    return notDeleted.filter((member) => member.deactivatedAt === undefined);
  }

  async function requireMember(memberId: string, functionName: string): Promise<MemberRecord> {
    const member = await adapter.members.get(memberId);
    if (member === undefined) {
      throw new Error(`${functionName}: no member found for the given id`);
    }
    return member;
  }

  async function renameMember(memberId: string, name: string): Promise<void> {
    // Color and memberId are untouched — spec.md 18.5 fixes the color for
    // life, a rename is not a re-join.
    const member = await requireMember(memberId, "renameMember");
    await adapter.members.put({ ...member, name });
  }

  async function deactivateMember(memberId: string): Promise<void> {
    const member = await requireMember(memberId, "deactivateMember");
    await adapter.members.put({ ...member, deactivatedAt: clock.now() });
  }

  async function reactivateMember(memberId: string): Promise<void> {
    const member = await requireMember(memberId, "reactivateMember");
    await adapter.members.put({ ...member, deactivatedAt: undefined });
  }

  async function deleteMember(memberId: string): Promise<void> {
    const member = await requireMember(memberId, "deleteMember");
    const expenses = await adapter.expenses.findBy("groupSlug", member.groupSlug);
    const settlements = await adapter.settlements.findBy("groupSlug", member.groupSlug);
    const hasTransaction =
      expenses.some((expense) => expenseReferencesMember(expense, memberId)) ||
      settlements.some((settlement) => settlementReferencesMember(settlement, memberId));

    if (hasTransaction) {
      throw new Error(
        "deleteMember: member already has recorded transactions (payer, item claimant, split " +
          "participant, treat party, or settlement) — deactivate the member instead of deleting them",
      );
    }
    await adapter.members.put({ ...member, deletedAt: clock.now() });
  }

  return { addMember, listMembers, renameMember, deactivateMember, reactivateMember, deleteMember };
}
