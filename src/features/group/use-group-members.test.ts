import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository, memberRepository } from "@/lib/storage/repositories";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import { useGroupMembers } from "./use-group-members";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear()]);
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
    splitData: { mode: "evenly", memberIds: ["m1"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "m1",
    ...overrides,
  };
}

describe("useGroupMembers", () => {
  it("reports not-found for a slug with no matching group", async () => {
    const { result } = renderHook(() => useGroupMembers("no-such-group"));
    await waitFor(() => expect(result.current.status).toBe("not-found"));
  });

  it("lists members in joinedAt order with their transaction counts", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    const { result } = renderHook(() => useGroupMembers("g1"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");
    expect(result.current.rows.map((row) => row.memberId)).toEqual(["m1"]);
    expect(result.current.rows[0]?.transactionCount).toBe(1);
  });

  // Selesai kalau (plan.md F3-09): a member who joins mid-group never gets
  // pulled into an expense recorded before their joinedAt. That's already
  // structural (an expense's splitData only ever lists the memberIds
  // chosen at save time — joining later can't retroactively add you to
  // one), but this locks it down from this screen's own read path.
  it("excludes a member from an expense's participants when they joined after it was recorded", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput({ date: 1_000 }));
    await memberRepository.addMember({ groupSlug: "g1", name: "Rina" }); // joins after the expense above

    const { result } = renderHook(() => useGroupMembers("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    const rina = result.current.rows.find((row) => row.name === "Rina");
    expect(rina).toBeDefined();
    expect(rina?.transactionCount).toBe(0);
  });

  it("keeps a deactivated member in the list, marked inactive, not removed", async () => {
    await seedGroup();
    await expenseRepository.createExpense(makeExpenseInput());
    await memberRepository.deactivateMember("m1");

    const { result } = renderHook(() => useGroupMembers("g1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("expected ready");

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]?.active).toBe(false);
    expect(result.current.rows[0]?.transactionCount).toBe(1);
  });
});
