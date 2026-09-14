import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { createSequentialIdGenerator } from "./id";
import { createSettlementRepository, type CreateSettlementInput } from "./settlement-repository";
import type { GroupRecord, MemberRecord } from "./records";

const GROUP_SLUG = "group-1";
const adapter = createDexieAdapter(db);

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear(), db.settlements.clear()]);
});

function makeGroup(overrides: Partial<GroupRecord> = {}): GroupRecord {
  return {
    slug: GROUP_SLUG,
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "blank",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
    ...overrides,
  };
}

function makeMember(overrides: Partial<MemberRecord>): MemberRecord {
  return {
    memberId: "member-x",
    groupSlug: GROUP_SLUG,
    name: "Member",
    color: "--m-1",
    joinedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

async function seedGroupWithMembers(): Promise<{ from: string; to: string }> {
  await db.groups.add(makeGroup());
  await db.members.bulkAdd([
    makeMember({ memberId: "m-from", name: "Farhan" }),
    makeMember({ memberId: "m-to", name: "Nadia" }),
  ]);
  return { from: "m-from", to: "m-to" };
}

function makeRepository() {
  return createSettlementRepository(adapter, createFixedClock(2_000, 100), createSequentialIdGenerator("s-"));
}

function makeInput(overrides: Partial<CreateSettlementInput> = {}): CreateSettlementInput {
  return {
    groupSlug: GROUP_SLUG,
    fromMemberId: "m-from",
    toMemberId: "m-to",
    amountMinor: 100_000,
    currency: "IDR",
    date: 2_000,
    ...overrides,
  };
}

describe("createSettlement and getSettlement", () => {
  it("stores and reads back a settlement unchanged", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    const created = await repository.createSettlement(makeInput());
    const readBack = await repository.getSettlement(created.settlementId);
    expect(readBack).toEqual(created);
  });

  it("accepts a partial payoff smaller than the full debt — spec.md 11.3", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    const created = await repository.createSettlement(makeInput({ amountMinor: 1_000 }));
    expect(created.amountMinor).toBe(1_000);
  });

  it("rejects a zero amount", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    await expect(repository.createSettlement(makeInput({ amountMinor: 0 }))).rejects.toThrow(/positive integer/);
  });

  it("rejects a negative amount", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    await expect(repository.createSettlement(makeInput({ amountMinor: -500 }))).rejects.toThrow(/positive integer/);
  });

  it("rejects a fractional amount", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    await expect(repository.createSettlement(makeInput({ amountMinor: 100.5 }))).rejects.toThrow(/positive integer/);
  });

  it("rejects fromMemberId equal to toMemberId", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    await expect(
      repository.createSettlement(makeInput({ fromMemberId: "m-from", toMemberId: "m-from" })),
    ).rejects.toThrow(/different members/);
  });

  it("rejects a member that isn't part of the group", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    await expect(
      repository.createSettlement(makeInput({ toMemberId: "someone-else" })),
    ).rejects.toThrow(/not a member/);
  });

  it("rejects a currency that doesn't match the group's base currency", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    await expect(repository.createSettlement(makeInput({ currency: "USD" }))).rejects.toThrow(/base currency/);
  });

  it("never leaks the group slug into the error for a nonexistent group — CLAUDE.md hard rule", async () => {
    const repository = makeRepository();
    const missingSlug = "never-logged-slug";

    await expect(repository.createSettlement(makeInput({ groupSlug: missingSlug }))).rejects.toThrow(
      /no group found/,
    );
    await expect(repository.createSettlement(makeInput({ groupSlug: missingSlug }))).rejects.not.toThrow(
      new RegExp(missingSlug),
    );
  });
});

describe("listSettlementsByGroup", () => {
  it("returns settlements ordered by date descending", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    const early = await repository.createSettlement(makeInput({ date: 1_000 }));
    const late = await repository.createSettlement(makeInput({ date: 3_000 }));
    const mid = await repository.createSettlement(makeInput({ date: 2_000 }));

    const list = await repository.listSettlementsByGroup(GROUP_SLUG);
    expect(list.map((settlement) => settlement.settlementId)).toEqual([
      late.settlementId,
      mid.settlementId,
      early.settlementId,
    ]);
  });
});

describe("softDeleteSettlement", () => {
  it("hides the settlement from getSettlement and listSettlementsByGroup, but keeps the record", async () => {
    await seedGroupWithMembers();
    const repository = makeRepository();
    const created = await repository.createSettlement(makeInput());

    await repository.softDeleteSettlement(created.settlementId);

    expect(await repository.getSettlement(created.settlementId)).toBeUndefined();
    expect(await repository.listSettlementsByGroup(GROUP_SLUG)).toEqual([]);

    const stillStored = await adapter.settlements.get(created.settlementId);
    expect(stillStored?.deletedAt).toBeDefined();

    const withDeleted = await repository.listSettlementsByGroup(GROUP_SLUG, { includeDeleted: true });
    expect(withDeleted.map((settlement) => settlement.settlementId)).toEqual([created.settlementId]);
  });
});
