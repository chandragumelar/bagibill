import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { createSequentialIdGenerator } from "./id";
import { createExpenseRepository, type CreateExpenseInput } from "./expense-repository";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.expenses.clear()]);
});

function makeRepository() {
  const adapter = createDexieAdapter(db);
  return {
    adapter,
    repository: createExpenseRepository(adapter, createFixedClock(1_000, 100), createSequentialIdGenerator("e-")),
  };
}

function makeCreateInput(overrides: Partial<CreateExpenseInput> = {}): CreateExpenseInput {
  return {
    groupSlug: "g1",
    title: "Makan malam",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [{ memberId: "m1", amountMinor: 10_000 }],
    splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "device-1",
    ...overrides,
  };
}

describe("createExpense and getExpense", () => {
  it("stores and reads back an expense unchanged, including minor-unit amounts", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(makeCreateInput());
    const readBack = await repository.getExpense(created.expenseId);
    expect(readBack).toEqual(created);
    expect(readBack?.amountTotalMinor).toBe(10_000);
  });
});

describe("updateExpense", () => {
  it("applies a partial patch, changing updatedAt but never createdAt or expenseId", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(makeCreateInput());
    const updated = await repository.updateExpense(created.expenseId, { title: "Makan siang" });
    expect(updated.title).toBe("Makan siang");
    expect(updated.expenseId).toBe(created.expenseId);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });
});

describe("softDeleteExpense", () => {
  it("hides the expense from getExpense but keeps the record in storage", async () => {
    const { repository, adapter } = makeRepository();
    const created = await repository.createExpense(makeCreateInput());
    await repository.softDeleteExpense(created.expenseId);

    expect(await repository.getExpense(created.expenseId)).toBeUndefined();
    const stillStored = await adapter.expenses.get(created.expenseId);
    expect(stillStored?.deletedAt).toBeDefined();
  });

  it("restores a soft-deleted expense without changing its original ordering fields", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(makeCreateInput({ date: 2_000 }));
    await repository.softDeleteExpense(created.expenseId);
    await repository.restoreExpense(created.expenseId);

    const restored = await repository.getExpense(created.expenseId);
    expect(restored?.deletedAt).toBeUndefined();
    expect(restored?.date).toBe(2_000);
    expect(restored?.createdAt).toBe(created.createdAt);
  });
});

describe("listExpensesByGroup", () => {
  it("defaults to date descending", async () => {
    const { repository } = makeRepository();
    await repository.createExpense(makeCreateInput({ date: 1_000 }));
    await repository.createExpense(makeCreateInput({ date: 3_000 }));
    await repository.createExpense(makeCreateInput({ date: 2_000 }));
    const list = await repository.listExpensesByGroup("g1");
    expect(list.map((expense) => expense.date)).toEqual([3_000, 2_000, 1_000]);
  });

  it("orders ascending when asked", async () => {
    const { repository } = makeRepository();
    await repository.createExpense(makeCreateInput({ date: 1_000 }));
    await repository.createExpense(makeCreateInput({ date: 3_000 }));
    await repository.createExpense(makeCreateInput({ date: 2_000 }));
    const list = await repository.listExpensesByGroup("g1", { order: "asc" });
    expect(list.map((expense) => expense.date)).toEqual([1_000, 2_000, 3_000]);
  });

  it("excludes another group's expenses", async () => {
    const { repository } = makeRepository();
    await repository.createExpense(makeCreateInput({ groupSlug: "g1" }));
    await repository.createExpense(makeCreateInput({ groupSlug: "g2" }));
    const list = await repository.listExpensesByGroup("g1");
    expect(list).toHaveLength(1);
    expect(list[0]?.groupSlug).toBe("g1");
  });

  it("excludes soft-deleted expenses by default and includes them when asked", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(makeCreateInput());
    await repository.softDeleteExpense(created.expenseId);

    expect(await repository.listExpensesByGroup("g1")).toEqual([]);
    const withDeleted = await repository.listExpensesByGroup("g1", { includeDeleted: true });
    expect(withDeleted).toHaveLength(1);
  });
});

describe("calculation gate", () => {
  it("rejects an expense whose payer memberId is not a split participant", async () => {
    const { repository } = makeRepository();
    await expect(
      repository.createExpense(makeCreateInput({ payers: [{ memberId: "ghost", amountMinor: 10_000 }] })),
    ).rejects.toThrow(/ghost/);
  });

  // Changed by K-122: calculateExpense no longer throws for a payments/shares
  // mismatch (only a structural failure still throws) — an expense whose
  // payer total doesn't match its shares is now valid, storable data with a
  // warning attached, not a rejected save. The old expectation here was
  // "rejects an expense whose total payments do not match the total bill".
  it("saves an expense whose total payments don't match the total bill, instead of rejecting it", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(makeCreateInput({ payers: [{ memberId: "m1", amountMinor: 5_000 }] }));
    const stored = await repository.getExpense(created.expenseId);
    expect(stored?.payers).toEqual([{ memberId: "m1", amountMinor: 5_000 }]);
  });

  it("saves a byItems expense with some items still unclaimed, and reads it back intact", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(
      makeCreateInput({
        amountTotalMinor: 10_000,
        payers: [{ memberId: "m1", amountMinor: 10_000 }],
        splitData: { mode: "byItems", memberIds: ["m1", "m2"] },
        items: [
          { itemId: "i1", name: "Nasi Goreng", unitPriceMinor: 6_000, quantity: 1, claims: [{ memberId: "m1", weight: 1 }] },
          { itemId: "i2", name: "Es Teh", unitPriceMinor: 4_000, quantity: 1, claims: [] },
        ],
      }),
    );
    const stored = await repository.getExpense(created.expenseId);
    expect(stored?.items).toHaveLength(2);
    expect(stored?.items[1]?.claims).toEqual([]);
  });

  it("saves an expense that only produces a warning, not an error", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(
      makeCreateInput({
        splitData: {
          mode: "byAdjustment",
          entries: [
            { memberId: "m1", adjustmentMinor: -8_000 },
            { memberId: "m2", adjustmentMinor: 8_000 },
          ],
        },
      }),
    );
    const stored = await repository.getExpense(created.expenseId);
    expect(stored).toBeDefined();
  });

  it("rejects an update patch that breaks the calculation gate", async () => {
    const { repository } = makeRepository();
    const created = await repository.createExpense(makeCreateInput());
    await expect(
      repository.updateExpense(created.expenseId, { payers: [{ memberId: "ghost", amountMinor: 10_000 }] }),
    ).rejects.toThrow(/ghost/);
  });
});
