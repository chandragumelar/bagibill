import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { createSequentialIdGenerator } from "./id";
import { createMemberRepository } from "./member-repository";
import type { ExpenseRecord, SettlementRecord } from "./records";

const GROUP_SLUG = "group-1";
const adapter = createDexieAdapter(db);

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.members.clear(), db.expenses.clear(), db.settlements.clear()]);
});

function makeRepository() {
  return createMemberRepository(adapter, createFixedClock(1_000), createSequentialIdGenerator("member-"));
}

function makeExpense(overrides: Partial<ExpenseRecord>): ExpenseRecord {
  return {
    expenseId: "expense-1",
    groupSlug: GROUP_SLUG,
    title: "Test expense",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [],
    splitData: { mode: "evenly", memberIds: [] },
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

function makeSettlement(overrides: Partial<SettlementRecord>): SettlementRecord {
  return {
    settlementId: "settlement-1",
    groupSlug: GROUP_SLUG,
    fromMemberId: "",
    toMemberId: "",
    amountMinor: 5_000,
    currency: "IDR",
    date: 1_000,
    createdAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

describe("addMember colors", () => {
  it("assigns colors 1 through 12 in order, then wraps back to 1", async () => {
    const repository = makeRepository();
    const colors: string[] = [];
    for (let i = 0; i < 13; i += 1) {
      const member = await repository.addMember({ groupSlug: GROUP_SLUG, name: `Member ${i}` });
      colors.push(member.color);
    }
    expect(colors.slice(0, 12)).toEqual(Array.from({ length: 12 }, (_, index) => `--m-${index + 1}`));
    expect(colors[12]).toBe("--m-1");
  });

  it("keeps counting from the group's full history, not from active members, after a deactivation", async () => {
    const repository = makeRepository();
    const first = await repository.addMember({ groupSlug: GROUP_SLUG, name: "A" });
    await repository.deactivateMember(first.memberId);
    const second = await repository.addMember({ groupSlug: GROUP_SLUG, name: "B" });
    expect(second.color).toBe("--m-2");
  });

  it("does not change color on rename", async () => {
    const repository = makeRepository();
    const member = await repository.addMember({ groupSlug: GROUP_SLUG, name: "A" });
    await repository.renameMember(member.memberId, "A Renamed");
    const [stored] = await repository.listMembers(GROUP_SLUG);
    expect(stored?.color).toBe(member.color);
    expect(stored?.name).toBe("A Renamed");
  });

  it("keeps the same color through deactivate and reactivate", async () => {
    const repository = makeRepository();
    const member = await repository.addMember({ groupSlug: GROUP_SLUG, name: "A" });
    await repository.deactivateMember(member.memberId);
    await repository.reactivateMember(member.memberId);
    const [stored] = await repository.listMembers(GROUP_SLUG);
    expect(stored?.color).toBe(member.color);
  });
});

describe("listMembers", () => {
  it("hides deactivated members by default and includes them when asked", async () => {
    const repository = makeRepository();
    const active = await repository.addMember({ groupSlug: GROUP_SLUG, name: "Active" });
    const inactive = await repository.addMember({ groupSlug: GROUP_SLUG, name: "Inactive" });
    await repository.deactivateMember(inactive.memberId);

    const defaultList = await repository.listMembers(GROUP_SLUG);
    expect(defaultList.map((member) => member.memberId)).toEqual([active.memberId]);

    const fullList = await repository.listMembers(GROUP_SLUG, { includeInactive: true });
    expect(fullList.map((member) => member.memberId).sort()).toEqual(
      [active.memberId, inactive.memberId].sort(),
    );
  });
});

describe("deleteMember", () => {
  it("rejects deleting a member who is a payer on an expense, with a clear error", async () => {
    const repository = makeRepository();
    const member = await repository.addMember({ groupSlug: GROUP_SLUG, name: "Payer" });
    await db.expenses.add(makeExpense({ payers: [{ memberId: member.memberId, amountMinor: 10_000 }] }));

    await expect(repository.deleteMember(member.memberId)).rejects.toThrow(/transaction/i);
  });

  it("rejects deleting a member who claimed an item, with a clear error", async () => {
    const repository = makeRepository();
    const member = await repository.addMember({ groupSlug: GROUP_SLUG, name: "Claimant" });
    await db.expenses.add(
      makeExpense({
        items: [
          {
            itemId: "item-1",
            name: "Nasi goreng",
            unitPriceMinor: 20_000,
            quantity: 1,
            claims: [{ memberId: member.memberId, weight: 1 }],
          },
        ],
      }),
    );

    await expect(repository.deleteMember(member.memberId)).rejects.toThrow(/transaction/i);
  });

  it("rejects deleting a member who appears in a SettlementRecord, with a clear error", async () => {
    const repository = makeRepository();
    const from = await repository.addMember({ groupSlug: GROUP_SLUG, name: "From" });
    const to = await repository.addMember({ groupSlug: GROUP_SLUG, name: "To" });
    await db.settlements.add(makeSettlement({ fromMemberId: from.memberId, toMemberId: to.memberId }));

    await expect(repository.deleteMember(from.memberId)).rejects.toThrow(/transaction/i);
  });

  it("deletes a member with no transactions", async () => {
    const repository = makeRepository();
    const member = await repository.addMember({ groupSlug: GROUP_SLUG, name: "Untouched" });

    await repository.deleteMember(member.memberId);

    const stored = await repository.listMembers(GROUP_SLUG, { includeInactive: true });
    expect(stored).toEqual([]);
  });
});
