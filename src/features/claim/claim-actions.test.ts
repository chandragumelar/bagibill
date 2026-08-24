import { describe, expect, it } from "vitest";
import { allocateByWeights, splitByItems } from "@bagibill/split-engine";
import type { ExpenseItemRecord, ExpenseRecord } from "@/lib/storage/records";
import { claimItem, computeMyShare, resolveTapEffect, unclaimItem } from "./claim-actions";

function item(overrides: Partial<ExpenseItemRecord> & Pick<ExpenseItemRecord, "itemId">): ExpenseItemRecord {
  return {
    name: "Item",
    unitPriceMinor: 10_000,
    quantity: 1,
    claims: [],
    ...overrides,
  };
}

function toEngineItems(items: readonly ExpenseItemRecord[], memberOrder: readonly string[]) {
  return items.map((record) => ({
    unitPriceMinor: record.unitPriceMinor,
    quantity: record.quantity,
    claims: record.claims.map((claim) => ({
      participantIndex: memberOrder.indexOf(claim.memberId),
      weight: claim.weight,
    })),
  }));
}

const MEMBER_ORDER = ["m1", "m2", "m3"];

function expense(items: readonly ExpenseItemRecord[]): ExpenseRecord {
  const totalMinor = items.reduce((sum, current) => sum + current.unitPriceMinor * current.quantity, 0);
  return {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Makan Malam",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: totalMinor,
    payers: [{ memberId: "m1", amountMinor: totalMinor }],
    splitData: { mode: "byItems", memberIds: MEMBER_ORDER },
    charges: [],
    items,
    treats: [],
    attachments: [],
    createdBy: "m1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
  };
}

describe("claimItem", () => {
  it("gives the first claim on an item weight 1", () => {
    const items = [item({ itemId: "i1" })];
    const result = claimItem(items, "i1", "m1");
    expect(result[0]?.claims).toEqual([{ memberId: "m1", weight: 1 }]);
  });

  it("is idempotent — claiming an item you already claim changes nothing", () => {
    const items = [item({ itemId: "i1", claims: [{ memberId: "m1", weight: 1 }] })];
    const result = claimItem(items, "i1", "m1");
    expect(result[0]?.claims).toEqual([{ memberId: "m1", weight: 1 }]);
  });

  it("claims two different items independently", () => {
    const items = [item({ itemId: "i1" }), item({ itemId: "i2" })];
    const afterFirst = claimItem(items, "i1", "m1");
    const afterSecond = claimItem(afterFirst, "i2", "m2");
    expect(afterSecond[0]?.claims).toEqual([{ memberId: "m1", weight: 1 }]);
    expect(afterSecond[1]?.claims).toEqual([{ memberId: "m2", weight: 1 }]);
  });

  it("sharing (claiming an item someone else already holds) results in two weight-1 claimants", () => {
    const items = [item({ itemId: "i1", claims: [{ memberId: "m2", weight: 1 }] })];
    const result = claimItem(items, "i1", "m1");
    expect(result[0]?.claims).toEqual([
      { memberId: "m2", weight: 1 },
      { memberId: "m1", weight: 1 },
    ]);
  });
});

describe("unclaimItem", () => {
  it("removes only the given person's claim entry, leaving other claimants untouched", () => {
    const items = [
      item({
        itemId: "i1",
        claims: [
          { memberId: "m1", weight: 1 },
          { memberId: "m2", weight: 1 },
        ],
      }),
    ];
    const result = unclaimItem(items, "i1", "m1");
    expect(result[0]?.claims).toEqual([{ memberId: "m2", weight: 1 }]);
  });

  it("leaves an item unclaimed and forces it on nobody when nobody has claimed it", () => {
    const items = [item({ itemId: "i1" })];
    const result = unclaimItem(items, "i1", "m1");
    expect(result[0]?.claims).toEqual([]);
  });
});

describe("resolveTapEffect", () => {
  it("claims directly when nobody has claimed the item yet", () => {
    expect(resolveTapEffect(item({ itemId: "i1" }), "m1")).toEqual({ kind: "claimed" });
  });

  it("releases when the tapper already claims the item", () => {
    const target = item({ itemId: "i1", claims: [{ memberId: "m1", weight: 1 }] });
    expect(resolveTapEffect(target, "m1")).toEqual({ kind: "released" });
  });

  it("asks to confirm sharing when exactly one other person already claims the item", () => {
    const target = item({ itemId: "i1", claims: [{ memberId: "m2", weight: 1 }] });
    expect(resolveTapEffect(target, "m1")).toEqual({ kind: "confirmShare", currentClaimantMemberId: "m2" });
  });

  it("joins directly (no confirmation) when the item is already shared by two or more people", () => {
    const target = item({
      itemId: "i1",
      claims: [
        { memberId: "m2", weight: 1 },
        { memberId: "m3", weight: 1 },
      ],
    });
    expect(resolveTapEffect(target, "m1")).toEqual({ kind: "joined" });
  });
});

describe("claim results match splitByItems", () => {
  it("produces items splitByItems accepts, with shares that sum to the item total", () => {
    let items: readonly ExpenseItemRecord[] = [item({ itemId: "i1", unitPriceMinor: 45_000, quantity: 1 })];
    items = claimItem(items, "i1", "m2");
    items = claimItem(items, "i1", "m1"); // bagi berdua

    const engineItems = toEngineItems(items, MEMBER_ORDER);
    const result = splitByItems({ participantCount: MEMBER_ORDER.length, items: engineItems });

    expect(result.perItem[0]?.sharesMinor.reduce((sum, share) => sum + share, 0)).toBe(45_000);
    // Splitting a quantity-1 item between two people is exactly what "bagi
    // berdua" means — the engine flags it as an informational mismatch
    // (spec.md 9.3: "informatif saja"), not a rejected save.
    expect(result.warnings).toEqual([{ code: "claim_weight_mismatch", itemIndices: [0] }]);
  });
});

describe("computeMyShare", () => {
  it("sums shares only from items the member actually claimed", () => {
    let items: readonly ExpenseItemRecord[] = [
      item({ itemId: "i1", unitPriceMinor: 42_000, quantity: 1 }),
      item({ itemId: "i2", unitPriceMinor: 6_000, quantity: 4 }),
    ];
    items = claimItem(items, "i1", "m2");
    items = claimItem(items, "i2", "m2");
    items = claimItem(items, "i2", "m1");

    const summary = computeMyShare(expense(items), "m2");
    expect(summary).toBeDefined();
    if (summary === undefined) return;

    const expectedItem2Share = allocateByWeights({ totalMinor: 24_000, weights: [1, 1] })[0];
    expect(summary.items).toEqual([
      { itemId: "i1", name: "Item", shareMinor: 42_000, claimantCount: 1 },
      { itemId: "i2", name: "Item", shareMinor: expectedItem2Share, claimantCount: 2 },
    ]);
    expect(summary.totalMinor).toBe(42_000 + (expectedItem2Share ?? 0));
  });

  it("returns undefined for a member who isn't a participant of the expense", () => {
    const items = [item({ itemId: "i1", claims: [{ memberId: "m1", weight: 1 }] })];
    expect(computeMyShare(expense(items), "not-a-participant")).toBeUndefined();
  });
});
