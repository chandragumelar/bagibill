import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository } from "@/lib/storage/repositories";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import { useGroupDetail } from "./use-group-detail";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
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
  await adapter.members.put({ memberId: "m1", groupSlug: "g1", name: "Andi", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: "g1", name: "Rina", color: "--m-2", joinedAt: 2_000, seq: 0 });
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

describe("useGroupDetail", () => {
  it("loads a group with its expenses", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());

    const { result } = renderHook(() => useGroupDetail("g1"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");
    expect(result.current.group.name).toBe("Trip Bali");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.row.kind).toBe("expense");
  });

  it("reports not-found for a slug with no matching group", async () => {
    const { result } = renderHook(() => useGroupDetail("no-such-group"));
    await waitFor(() => expect(result.current.status).toBe("not-found"));
  });

  it("reports an error state and can retry", async () => {
    await seedGroup();
    const spy = vi.spyOn(expenseRepository, "listExpensesByGroup").mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useGroupDetail("g1"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    spy.mockRestore();
    if (result.current.status !== "error") throw new Error("expected error");
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("orders expenses by date descending", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput({ title: "Pagi", date: 1_000 }));
    await expenseRepository.createExpense(makeExpenseInput({ title: "Malam", date: 3_000 }));
    await expenseRepository.createExpense(makeExpenseInput({ title: "Siang", date: 2_000 }));

    const { result } = renderHook(() => useGroupDetail("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.items.map((item) => item.date)).toEqual([3_000, 2_000, 1_000]);
  });

  it("isolates one broken expense as a broken row without dropping the rest", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput({ title: "Baik", date: 2_000 }));
    // createExpense itself gates every save through calculateExpense
    // (K-64), so a genuinely broken record can only get into storage by
    // writing straight to the adapter — simulating corruption that slipped
    // past that gate (a payments/shares mismatch from a bug, a manual DB
    // edit, or old data from before the gate existed).
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

    const { result } = renderHook(() => useGroupDetail("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.items).toHaveLength(2);
    const kinds = result.current.items.map((item) => item.row.kind);
    expect(kinds).toContain("broken");
    expect(kinds).toContain("expense");
  });

  it("carries title, notes, and participants for filtering alongside the row", async () => {
    await seedGroup();
    await expenseRepository.createExpense(
      makeExpenseInput({ title: "Sate Padang", notes: "traktir Rina", splitData: { mode: "evenly", memberIds: ["m1", "m2"] } }),
    );

    const { result } = renderHook(() => useGroupDetail("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const item = result.current.items[0];
    expect(item?.title).toBe("Sate Padang");
    expect(item?.notes).toBe("traktir Rina");
    expect(item?.participantMemberIds).toEqual(["m1", "m2"]);
    expect(result.current.members).toEqual([
      { memberId: "m1", name: "Andi" },
      { memberId: "m2", name: "Rina" },
    ]);
  });

  it("falls back to the payer list for a broken row's participants, still readable off the record", async () => {
    await seedGroup();
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

    const { result } = renderHook(() => useGroupDetail("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const broken = result.current.items.find((item) => item.row.kind === "broken");
    // splitData reads fine here (only the calculation itself is broken), so
    // participantMemberIds still comes from splitData.memberIds, same as any
    // other row — the payers-only fallback only kicks in when splitData
    // itself can't be read at all.
    expect(broken?.participantMemberIds).toEqual(["m1", "m2"]);
  });
});
