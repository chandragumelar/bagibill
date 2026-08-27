import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository } from "@/lib/storage/repositories";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import { useGroupBalance } from "@/features/settle";
import { useHomeGroups } from "./use-home-groups";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear()]);
});

async function seedGroup(slug: string, name: string): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug,
    name,
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.put({ memberId: `${slug}-m1`, groupSlug: slug, name: "Andi", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: `${slug}-m2`, groupSlug: slug, name: "Rina", color: "--m-2", joinedAt: 2_000, seq: 0 });
}

function makeExpenseInput(slug: string, overrides: Partial<CreateExpenseInput> = {}): CreateExpenseInput {
  return {
    groupSlug: slug,
    title: "Makan malam",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [{ memberId: `${slug}-m1`, amountMinor: 10_000 }],
    splitData: { mode: "evenly", memberIds: [`${slug}-m1`, `${slug}-m2`] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: `${slug}-m1`,
    ...overrides,
  };
}

describe("useHomeGroups", () => {
  it("reports loading before the first result arrives", () => {
    const { result } = renderHook(() => useHomeGroups());
    expect(result.current.status).toBe("loading");
  });

  it("reports an empty ready list when there are no groups", async () => {
    const { result } = renderHook(() => useHomeGroups());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");
    expect(result.current.groups).toEqual([]);
  });

  // This is F3-10's own done-criteria (plan.md): the card's amount must be
  // bit-for-bit the same number the Saldo tab shows for the same group,
  // because both go through computeGroupBalanceState. A hand-rolled second
  // calculation here would be exactly the leak the criteria forbids.
  it("matches useGroupBalance's position for the same group", async () => {
    await seedGroup("g1", "Trip Bali");
    await expenseRepository.createExpense(makeExpenseInput("g1"));

    const home = renderHook(() => useHomeGroups());
    const balance = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(home.result.current.status).toBe("ready"));
    await waitFor(() => expect(balance.result.current.status).toBe("ready"));
    if (home.result.current.status !== "ready") throw new Error("expected ready");
    if (balance.result.current.status !== "ready") throw new Error("expected ready");

    const card = home.result.current.groups.find((group) => group.slug === "g1");
    if (card === undefined) throw new Error("expected g1 card");

    expect(card.netMinor).toBe(balance.result.current.position.netMinor);
    expect(card.currency).toBe(balance.result.current.currency);
    expect(card.expenseCount).toBe(balance.result.current.expenseCount);
  });

  it("reports zero and no-transactions for a group that has never had an expense", async () => {
    await seedGroup("g1", "Kosan Blok C");

    const { result } = renderHook(() => useHomeGroups());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const card = result.current.groups[0];
    if (card === undefined) throw new Error("expected one card");
    expect(card.netMinor).toBe(0);
    expect(card.hasTransactions).toBe(false);
    expect(card.memberCount).toBe(2);
  });

  it("loads every group's position independently, in listGroups order", async () => {
    await seedGroup("g1", "Trip Bali");
    await seedGroup("g2", "Kosan Blok C");
    await expenseRepository.createExpense(makeExpenseInput("g1"));

    const { result } = renderHook(() => useHomeGroups());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.groups).toHaveLength(2);
    const trip = result.current.groups.find((group) => group.slug === "g1");
    const kosan = result.current.groups.find((group) => group.slug === "g2");
    expect(trip?.hasTransactions).toBe(true);
    expect(kosan?.hasTransactions).toBe(false);
  });
});
