import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import type { ExpenseRecord, GroupRecord, MemberRecord } from "./records";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([
    db.groups.clear(),
    db.members.clear(),
    db.expenses.clear(),
    db.settlements.clear(),
    db.activityLog.clear(),
  ]);
});

function makeGroup(overrides: Partial<GroupRecord> = {}): GroupRecord {
  return {
    slug: "g1",
    name: "Trip",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
    ...overrides,
  };
}

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    memberId: "m1",
    groupSlug: "g1",
    name: "Dimas",
    color: "--m-1",
    joinedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Makan",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [],
    splitData: { mode: "evenly", memberIds: ["m1"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "device-1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

describe("get and put", () => {
  it("puts and gets a group record", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.groups.put(makeGroup());
    expect(await adapter.groups.get("g1")).toEqual(makeGroup());
  });

  it("puts and gets a member record", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.members.put(makeMember());
    expect(await adapter.members.get("m1")).toEqual(makeMember());
  });

  it("returns undefined for a missing key", async () => {
    const adapter = createDexieAdapter(db);
    expect(await adapter.groups.get("missing")).toBeUndefined();
  });
});

describe("putMany", () => {
  it("writes multiple member records at once", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.members.putMany([makeMember({ memberId: "m1" }), makeMember({ memberId: "m2" })]);
    expect((await adapter.members.all()).map((member) => member.memberId).sort()).toEqual(["m1", "m2"]);
  });

  it("writes multiple expense records at once", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.expenses.putMany([makeExpense({ expenseId: "e1" }), makeExpense({ expenseId: "e2" })]);
    expect((await adapter.expenses.all()).map((expense) => expense.expenseId).sort()).toEqual(["e1", "e2"]);
  });
});

describe("findBy", () => {
  it("finds members by groupSlug", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.members.putMany([
      makeMember({ memberId: "m1", groupSlug: "g1" }),
      makeMember({ memberId: "m2", groupSlug: "g2" }),
    ]);
    const found = await adapter.members.findBy("groupSlug", "g1");
    expect(found.map((member) => member.memberId)).toEqual(["m1"]);
  });

  it("finds expenses by groupSlug", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.expenses.putMany([
      makeExpense({ expenseId: "e1", groupSlug: "g1" }),
      makeExpense({ expenseId: "e2", groupSlug: "g2" }),
    ]);
    const found = await adapter.expenses.findBy("groupSlug", "g1");
    expect(found.map((expense) => expense.expenseId)).toEqual(["e1"]);
  });
});

describe("findByRange", () => {
  it("returns expenses within a date range on the compound [groupSlug+date] index, in order", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.expenses.putMany([
      makeExpense({ expenseId: "e-mid", date: 2_000 }),
      makeExpense({ expenseId: "e-first", date: 1_000 }),
      makeExpense({ expenseId: "e-last", date: 3_000 }),
    ]);
    const found = await adapter.expenses.findByRange(
      "[groupSlug+date]",
      ["g1", Number.NEGATIVE_INFINITY],
      ["g1", Number.POSITIVE_INFINITY],
    );
    expect(found.map((expense) => expense.expenseId)).toEqual(["e-first", "e-mid", "e-last"]);
  });
});

describe("all", () => {
  it("returns every group across the table", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.groups.putMany([makeGroup({ slug: "g1" }), makeGroup({ slug: "g2" })]);
    expect((await adapter.groups.all()).map((group) => group.slug).sort()).toEqual(["g1", "g2"]);
  });
});

describe("transaction", () => {
  it("rolls back every write when the callback throws partway through", async () => {
    const adapter = createDexieAdapter(db);
    await expect(
      adapter.transaction(async () => {
        await adapter.groups.put(makeGroup({ slug: "g1" }));
        await adapter.members.put(makeMember({ memberId: "m1" }));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await adapter.groups.get("g1")).toBeUndefined();
    expect(await adapter.members.get("m1")).toBeUndefined();
  });

  it("keeps every write when the callback succeeds", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.transaction(async () => {
      await adapter.groups.put(makeGroup({ slug: "g1" }));
      await adapter.members.put(makeMember({ memberId: "m1" }));
    });

    expect(await adapter.groups.get("g1")).toEqual(makeGroup());
    expect(await adapter.members.get("m1")).toEqual(makeMember());
  });
});
