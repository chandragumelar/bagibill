import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository } from "@/lib/storage/repositories";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import type { GroupSettings } from "@/lib/storage/records";
import { useGroupBalance } from "./use-group-balance";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear()]);
});

async function seedGroup(settings: Partial<GroupSettings> = {}): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug: "g1",
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false, ...settings },
    seq: 0,
  });
  await adapter.members.put({ memberId: "m1", groupSlug: "g1", name: "Andi", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: "g1", name: "Rina", color: "--m-2", joinedAt: 2_000, seq: 0 });
}

async function seedInactiveMember(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.members.put({
    memberId: "m3",
    groupSlug: "g1",
    name: "Budi",
    color: "--m-3",
    joinedAt: 500,
    deactivatedAt: 3_000,
    seq: 0,
  });
}

function makeExpenseInput(overrides: Partial<CreateExpenseInput> = {}): CreateExpenseInput {
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
    createdBy: "m1",
    ...overrides,
  };
}

async function seedBrokenExpense(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.expenses.put({
    expenseId: "e-broken",
    groupSlug: "g1",
    title: "Rusak",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [{ memberId: "m1", amountMinor: 4_000 }],
    splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "m1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
  });
}

describe("useGroupBalance", () => {
  it("reports loading before the first result arrives", () => {
    const { result } = renderHook(() => useGroupBalance("g1"));
    expect(result.current.status).toBe("loading");
  });

  it("reaches ready and sums every member's net balance to zero", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const total = result.current.rows.reduce((sum, row) => sum + row.netMinor, 0);
    expect(total).toBe(0);
  });

  it("keeps a deactivated member in the canonical order when they still carry a balance", async () => {
    await seedGroup();
    await seedInactiveMember();
    await expenseRepository.createExpense(
      makeExpenseInput({ payers: [{ memberId: "m3", amountMinor: 10_000 }], splitData: { mode: "evenly", memberIds: ["m1", "m2", "m3"] } }),
    );

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const inactiveRow = result.current.rows.find((row) => row.memberId === "m3");
    expect(inactiveRow).toBeDefined();
    expect(inactiveRow?.isInactive).toBe(true);
    expect(inactiveRow?.netMinor).not.toBe(0);
  });

  it("excludes a broken expense from the calculation and reports how many were dropped", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput({ title: "Baik" }));
    await seedBrokenExpense();

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.uncountedExpenseCount).toBe(1);
    expect(result.current.expenseCount).toBe(2);
    // The one good expense still balances to zero on its own — the broken
    // one contributed nothing, not a silently wrong number.
    expect(result.current.rows.reduce((sum, row) => sum + row.netMinor, 0)).toBe(0);
  });

  it("still reaches ready with all-zero rows when every expense fails to calculate", async () => {
    await seedGroup();
    await seedBrokenExpense();

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.uncountedExpenseCount).toBe(1);
    expect(result.current.rows.every((row) => row.netMinor === 0)).toBe(true);
  });

  it("reads the initial mode from group.settings.simplifyDebts", async () => {
    await seedGroup({ simplifyDebts: false });
    await expenseRepository.createExpense(makeExpenseInput());

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.initialMode).toBe("direct");
  });

  it("reports empty for a group with no expenses yet", async () => {
    await seedGroup();

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("reports an error state and can retry", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    const spy = vi.spyOn(expenseRepository, "listExpensesByGroup").mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    spy.mockRestore();
    if (result.current.status !== "error") throw new Error("expected error");
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });
});
