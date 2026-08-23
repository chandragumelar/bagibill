import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { useSettlements } from "./use-settlements";

const GROUP_SLUG = "g1";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear(), db.settlements.clear()]);
});

async function seedGroup(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug: GROUP_SLUG,
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.put({ memberId: "m1", groupSlug: GROUP_SLUG, name: "Andi", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: GROUP_SLUG, name: "Rina", color: "--m-2", joinedAt: 2_000, seq: 0 });
}

describe("useSettlements", () => {
  it("starts empty and picks up a created settlement", async () => {
    await seedGroup();
    const { result } = renderHook(() => useSettlements(GROUP_SLUG));
    expect(result.current.settlements).toEqual([]);

    await act(async () => {
      await result.current.createSettlement({
        fromMemberId: "m1",
        toMemberId: "m2",
        amountMinor: 10_000,
        currency: "IDR",
        date: 1_000,
      });
    });

    await waitFor(() => expect(result.current.settlements).toHaveLength(1));
    expect(result.current.settlements[0]?.fromMemberId).toBe("m1");
  });

  it("removes an undone settlement from the visible list", async () => {
    await seedGroup();
    const { result } = renderHook(() => useSettlements(GROUP_SLUG));

    let settlementId = "";
    await act(async () => {
      const created = await result.current.createSettlement({
        fromMemberId: "m1",
        toMemberId: "m2",
        amountMinor: 10_000,
        currency: "IDR",
        date: 1_000,
      });
      settlementId = created.settlementId;
    });
    await waitFor(() => expect(result.current.settlements).toHaveLength(1));

    await act(async () => {
      await result.current.undoSettlement(settlementId);
    });

    await waitFor(() => expect(result.current.settlements).toHaveLength(0));
  });
});
