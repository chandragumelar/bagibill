import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository, settlementRepository } from "@/lib/storage/repositories";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import type { CreateSettlementInput } from "@/lib/storage/settlement-repository";
import type { GroupSettings } from "@/lib/storage/records";
import { useGroupBalance } from "./use-group-balance";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear()]);
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

function makeSettlementInput(overrides: Partial<CreateSettlementInput> = {}): CreateSettlementInput {
  return {
    groupSlug: "g1",
    fromMemberId: "m1",
    toMemberId: "m2",
    amountMinor: 5_000,
    currency: "IDR",
    date: 1_000,
    ...overrides,
  };
}

function rowFor(rows: readonly { readonly memberId: string; readonly netMinor: number }[], memberId: string): number {
  const row = rows.find((candidate) => candidate.memberId === memberId);
  if (row === undefined) throw new Error(`row not found for ${memberId}`);
  return row.netMinor;
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

describe("useGroupBalance with settlements", () => {
  it("brings both members' balances to zero after a full payoff", async () => {
    await seedGroup();
    // m1 pays 10_000, split evenly -> m1 net +5_000, m2 net -5_000.
    await expenseRepository.createExpense(makeExpenseInput());
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 5_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(rowFor(result.current.rows, "m1")).toBe(0);
    expect(rowFor(result.current.rows, "m2")).toBe(0);
  });

  it("leaves the remainder owed after a partial payoff", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 2_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(rowFor(result.current.rows, "m1")).toBe(3_000);
    expect(rowFor(result.current.rows, "m2")).toBe(-3_000);
  });

  it("keeps the group's balances summing to zero once a settlement exists", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 2_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.rows.reduce((sum, row) => sum + row.netMinor, 0)).toBe(0);
  });

  it("restores the prior balance after a settlement is undone (soft-deleted)", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    const settlement = await settlementRepository.createSettlement(
      makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 5_000 }),
    );

    const { result, rerender } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");
    expect(rowFor(result.current.rows, "m1")).toBe(0);

    await settlementRepository.softDeleteSettlement(settlement.settlementId);
    result.current.reload();
    rerender();

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("expected ready");
      expect(rowFor(result.current.rows, "m1")).toBe(5_000);
    });
  });

  it("flips the balance direction when a payoff overshoots the actual debt — nothing forbids this at the storage layer", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 9_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(rowFor(result.current.rows, "m1")).toBe(-4_000);
    expect(rowFor(result.current.rows, "m2")).toBe(4_000);
  });

  it("counts settlements separately from expenses", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 2_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.expenseCount).toBe(1);
    expect(result.current.settlementCount).toBe(1);
  });

  it("keeps origins parallel to ledgers, in the same order fed into the engine", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput({ title: "Makan malam" }));
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 2_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.ledgers).toHaveLength(2);
    expect(result.current.origins).toHaveLength(2);
    expect(result.current.origins[0]).toMatchObject({ kind: "expense", title: "Makan malam" });
  });

  it("records a settlement's origin as kind settlement, never disguised as an expense", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    await settlementRepository.createSettlement(makeSettlementInput({ fromMemberId: "m2", toMemberId: "m1", amountMinor: 2_000 }));

    const { result } = renderHook(() => useGroupBalance("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const settlementOrigin = result.current.origins.find((origin) => origin.kind === "settlement");
    expect(settlementOrigin).toMatchObject({ kind: "settlement", fromMemberId: "m2", toMemberId: "m1" });
  });
});
