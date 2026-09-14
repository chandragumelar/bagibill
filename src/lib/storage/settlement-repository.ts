import type { StorageAdapter } from "./adapter";
import type { Clock } from "./clock";
import type { IdGenerator } from "./id";
import type { SettlementRecord } from "./records";

export interface CreateSettlementInput {
  readonly groupSlug: string;
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly date: number;
  readonly note?: string;
}

export interface ListSettlementsOptions {
  readonly includeDeleted?: boolean;
}

export interface SettlementRepository {
  createSettlement(input: CreateSettlementInput): Promise<SettlementRecord>;
  getSettlement(settlementId: string): Promise<SettlementRecord | undefined>;
  listSettlementsByGroup(groupSlug: string, options?: ListSettlementsOptions): Promise<readonly SettlementRecord[]>;
  softDeleteSettlement(settlementId: string): Promise<void>;
}

// spec.md 11.3 allows partial payoffs — the remainder just stays owed — so
// there's no check here that amountMinor equals what the pair actually owes
// each other. Only the shape of the record itself is validated.
async function assertValidSettlement(adapter: StorageAdapter, input: CreateSettlementInput): Promise<void> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error(`createSettlement: amountMinor must be a positive integer, got ${input.amountMinor}`);
  }
  if (input.fromMemberId === input.toMemberId) {
    throw new Error("createSettlement: fromMemberId and toMemberId must be different members");
  }

  const group = await adapter.groups.get(input.groupSlug);
  if (group === undefined || group.deletedAt !== undefined) {
    throw new Error("createSettlement: no group found for the given slug");
  }
  if (input.currency !== group.baseCurrency) {
    throw new Error(
      `createSettlement: currency "${input.currency}" does not match group base currency "${group.baseCurrency}"`,
    );
  }

  const members = await adapter.members.findBy("groupSlug", input.groupSlug);
  const memberIds = new Set(members.filter((member) => member.deletedAt === undefined).map((member) => member.memberId));
  if (!memberIds.has(input.fromMemberId)) {
    throw new Error(`createSettlement: fromMemberId "${input.fromMemberId}" is not a member of this group`);
  }
  if (!memberIds.has(input.toMemberId)) {
    throw new Error(`createSettlement: toMemberId "${input.toMemberId}" is not a member of this group`);
  }
}

export function createSettlementRepository(
  adapter: StorageAdapter,
  clock: Clock,
  idGenerator: IdGenerator,
): SettlementRepository {
  async function createSettlement(input: CreateSettlementInput): Promise<SettlementRecord> {
    await assertValidSettlement(adapter, input);
    const settlement: SettlementRecord = {
      ...input,
      settlementId: idGenerator.nextId(),
      seq: 0,
      createdAt: clock.now(),
    };
    await adapter.settlements.put(settlement);
    return settlement;
  }

  async function getSettlement(settlementId: string): Promise<SettlementRecord | undefined> {
    const settlement = await adapter.settlements.get(settlementId);
    if (settlement === undefined || settlement.deletedAt !== undefined) {
      return undefined;
    }
    return settlement;
  }

  async function listSettlementsByGroup(
    groupSlug: string,
    options: ListSettlementsOptions = {},
  ): Promise<readonly SettlementRecord[]> {
    const includeDeleted = options.includeDeleted ?? false;
    const all = await adapter.settlements.findBy("groupSlug", groupSlug);
    const visible = includeDeleted ? all : all.filter((settlement) => settlement.deletedAt === undefined);
    return [...visible].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
  }

  async function softDeleteSettlement(settlementId: string): Promise<void> {
    const existing = await adapter.settlements.get(settlementId);
    if (existing === undefined) {
      throw new Error(`softDeleteSettlement: no settlement found for id "${settlementId}"`);
    }
    await adapter.settlements.put({ ...existing, deletedAt: clock.now() });
  }

  return { createSettlement, getSettlement, listSettlementsByGroup, softDeleteSettlement };
}
