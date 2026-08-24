import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository } from "@/lib/storage/repositories";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import { useClaim } from "./use-claim";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear()]);
});

async function seedGroup(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug: "g1",
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.put({ memberId: "m1", groupSlug: "g1", name: "Bagus Santoso", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: "g1", name: "Dimas Prasetyo", color: "--m-2", joinedAt: 2_000, seq: 0 });
}

function makeItemExpenseInput(overrides: Partial<CreateExpenseInput> = {}): CreateExpenseInput {
  return {
    groupSlug: "g1",
    title: "Makan Malam Tim",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 45_000,
    payers: [{ memberId: "m1", amountMinor: 45_000 }],
    splitData: { mode: "byItems", memberIds: ["m1", "m2"] },
    charges: [],
    items: [{ itemId: "i1", name: "Ayam Bakar Madu", unitPriceMinor: 45_000, quantity: 1, claims: [{ memberId: "m2", weight: 1 }] }],
    treats: [],
    attachments: [],
    createdBy: "m1",
    ...overrides,
  };
}

describe("useClaim", () => {
  it("loads the ready state with participants for a real link", async () => {
    await seedGroup();
    const expense = await expenseRepository.createExpense(makeItemExpenseInput());

    const { result } = renderHook(() => useClaim("g1", expense.expenseId));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(result.current.state.participants.map((participant) => participant.name)).toEqual(["Bagus Santoso", "Dimas Prasetyo"]);
    expect(result.current.state.currentMemberId).toBeUndefined();
  });

  it("shows an honest invalid state for a slug with no matching group", async () => {
    const { result } = renderHook(() => useClaim("no-such-group", "e1"));
    await waitFor(() => expect(result.current.state.status).toBe("invalid"));
  });

  it("shows an honest invalid state when the expense doesn't exist", async () => {
    await seedGroup();
    const { result } = renderHook(() => useClaim("g1", "no-such-expense"));
    await waitFor(() => expect(result.current.state.status).toBe("invalid"));
  });

  it("saves a partial claim on a still-incomplete expense with nol save failure, and the claim reads back from storage (K-122)", async () => {
    await seedGroup();
    const expense = await expenseRepository.createExpense(
      makeItemExpenseInput({
        amountTotalMinor: 90_000,
        items: [
          { itemId: "i1", name: "Nasi Goreng", unitPriceMinor: 15_000, quantity: 1, claims: [{ memberId: "m2", weight: 1 }] },
          { itemId: "i2", name: "Ayam Bakar Madu", unitPriceMinor: 15_000, quantity: 1, claims: [] },
          { itemId: "i3", name: "Es Teh", unitPriceMinor: 15_000, quantity: 1, claims: [] },
          { itemId: "i4", name: "Sate Kambing", unitPriceMinor: 15_000, quantity: 1, claims: [] },
          { itemId: "i5", name: "Gado-Gado", unitPriceMinor: 15_000, quantity: 1, claims: [] },
          { itemId: "i6", name: "Air Mineral", unitPriceMinor: 15_000, quantity: 1, claims: [] },
        ],
      }),
    );
    const { result } = renderHook(() => useClaim("g1", expense.expenseId));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    result.current.pickIdentity("m1");
    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.currentMemberId).toBe("m1");
    });

    await result.current.claim("i3");

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.saveError).toBe(false);
    });

    const stored = await expenseRepository.getExpense(expense.expenseId);
    const claimedItem = stored?.items.find((item) => item.itemId === "i3");
    expect(claimedItem?.claims).toEqual([{ memberId: "m1", weight: 1 }]);
    // Five of six items still unclaimed by anyone — the save itself must
    // stay unaffected by that (K-122: "can be calculated" vs "is balanced").
    const stillUnclaimed = stored?.items.filter((item) => item.claims.length === 0);
    expect(stillUnclaimed?.map((item) => item.itemId)).toEqual(["i2", "i4", "i5", "i6"]);
  });

  it("surfaces a save failure on the screen instead of the console when a mutation can't persist", async () => {
    await seedGroup();
    const expense = await expenseRepository.createExpense(makeItemExpenseInput());
    const { result } = renderHook(() => useClaim("g1", expense.expenseId));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    result.current.pickIdentity("m1");
    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.currentMemberId).toBe("m1");
    });

    const spy = vi.spyOn(expenseRepository, "updateExpense").mockRejectedValueOnce(new Error("boom"));
    await result.current.claim("i1");
    spy.mockRestore();

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.saveError).toBe(true);
    });
  });
});
