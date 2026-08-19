import { describe, expect, it } from "vitest";
import { splitByItems } from "./split-by-items";

describe("splitByItems", () => {
  it("gives the entire item to a single claimant with weight 1", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [{ unitPriceMinor: 50, quantity: 1, claims: [{ participantIndex: 0, weight: 1 }] }],
    });
    expect(result.sharesMinor).toEqual([50, 0]);
    expect(result.totalMinor).toBe(50);
  });

  it("splits a price that does not divide evenly among three equal-weight claimants", () => {
    const result = splitByItems({
      participantCount: 3,
      items: [
        {
          unitPriceMinor: 334,
          quantity: 1,
          claims: [
            { participantIndex: 0, weight: 1 },
            { participantIndex: 1, weight: 1 },
            { participantIndex: 2, weight: 1 },
          ],
        },
      ],
    });
    expect(result.sharesMinor).toEqual([112, 111, 111]);
  });

  it("keeps two items with different claimants separate", () => {
    const result = splitByItems({
      participantCount: 3,
      items: [
        { unitPriceMinor: 60, quantity: 1, claims: [{ participantIndex: 0, weight: 1 }] },
        { unitPriceMinor: 40, quantity: 1, claims: [{ participantIndex: 1, weight: 1 }] },
      ],
    });
    expect(result.sharesMinor).toEqual([60, 40, 0]);
  });

  it("multiplies unit price by quantity for an item bought more than once", () => {
    const result = splitByItems({
      participantCount: 1,
      items: [{ unitPriceMinor: 25, quantity: 4, claims: [{ participantIndex: 0, weight: 1 }] }],
    });
    expect(result.perItem[0]?.itemTotalMinor).toBe(100);
    expect(result.sharesMinor).toEqual([100]);
  });

  it("splits a non-uniform claim weight like [2, 1] proportionally", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [
        {
          unitPriceMinor: 30,
          quantity: 1,
          claims: [
            { participantIndex: 0, weight: 2 },
            { participantIndex: 1, weight: 1 },
          ],
        },
      ],
    });
    expect(result.sharesMinor).toEqual([20, 10]);
  });

  it("gives a participant who claims nothing a zero share everywhere", () => {
    const result = splitByItems({
      participantCount: 3,
      items: [
        { unitPriceMinor: 60, quantity: 1, claims: [{ participantIndex: 0, weight: 1 }] },
        { unitPriceMinor: 40, quantity: 1, claims: [{ participantIndex: 1, weight: 1 }] },
      ],
    });
    expect(result.perItem[0]?.sharesMinor[2]).toBe(0);
    expect(result.perItem[1]?.sharesMinor[2]).toBe(0);
    expect(result.sharesMinor[2]).toBe(0);
  });

  it("keeps the sum of shares plus the unclaimed total exactly equal to totalMinor across five uneven items", () => {
    const result = splitByItems({
      participantCount: 4,
      items: [
        {
          unitPriceMinor: 334,
          quantity: 1,
          claims: [
            { participantIndex: 0, weight: 1 },
            { participantIndex: 1, weight: 1 },
            { participantIndex: 2, weight: 1 },
          ],
        },
        { unitPriceMinor: 50, quantity: 2, claims: [{ participantIndex: 3, weight: 1 }] },
        { unitPriceMinor: 77, quantity: 1, claims: [] },
        {
          unitPriceMinor: 10,
          quantity: 5,
          claims: [
            { participantIndex: 0, weight: 2 },
            { participantIndex: 3, weight: 1 },
          ],
        },
        {
          unitPriceMinor: 99,
          quantity: 3,
          claims: [
            { participantIndex: 1, weight: 1 },
            { participantIndex: 2, weight: 1 },
            { participantIndex: 3, weight: 1 },
          ],
        },
      ],
    });

    expect(result.totalMinor).toBe(858);
    expect(result.unclaimedTotalMinor).toBe(77);
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor + result.unclaimedTotalMinor).toBe(result.totalMinor);
    expect(result.sharesMinor).toEqual([145, 210, 210, 216]);

    for (const breakdown of result.perItem) {
      if (breakdown.isUnclaimed) continue;
      const itemSumMinor = breakdown.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
      expect(itemSumMinor).toBe(breakdown.itemTotalMinor);
    }
  });

  it("splits a single item among a single participant", () => {
    const result = splitByItems({
      participantCount: 1,
      items: [{ unitPriceMinor: 20, quantity: 1, claims: [{ participantIndex: 0, weight: 1 }] }],
    });
    expect(result.sharesMinor).toEqual([20]);
  });

  it("marks an item with no claims as unclaimed and reports it in warnings", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [{ unitPriceMinor: 30, quantity: 1, claims: [] }],
    });
    expect(result.perItem[0]?.isUnclaimed).toBe(true);
    expect(result.perItem[0]?.sharesMinor).toEqual([0, 0]);
    expect(result.unclaimedTotalMinor).toBe(30);
    expect(result.sharesMinor).toEqual([0, 0]);
    expect(result.warnings).toEqual([{ code: "unclaimed_items", itemIndices: [0] }]);
  });

  it("reports every unclaimed item index in ascending order", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [
        { unitPriceMinor: 30, quantity: 1, claims: [] },
        { unitPriceMinor: 10, quantity: 1, claims: [{ participantIndex: 0, weight: 1 }] },
        { unitPriceMinor: 20, quantity: 1, claims: [] },
      ],
    });
    expect(result.warnings).toEqual([{ code: "unclaimed_items", itemIndices: [0, 2] }]);
  });

  it("still splits proportionally and flags hasWeightMismatch when claim weights don't sum to quantity", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [
        {
          unitPriceMinor: 30,
          quantity: 2,
          claims: [
            { participantIndex: 0, weight: 2 },
            { participantIndex: 1, weight: 1 },
          ],
        },
      ],
    });
    expect(result.perItem[0]?.hasWeightMismatch).toBe(true);
    expect(result.sharesMinor).toEqual([40, 20]);
    expect(result.warnings).toEqual([{ code: "claim_weight_mismatch", itemIndices: [0] }]);
  });

  it("gives everyone zero for a zero unit price item", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [
        {
          unitPriceMinor: 0,
          quantity: 2,
          claims: [
            { participantIndex: 0, weight: 1 },
            { participantIndex: 1, weight: 1 },
          ],
        },
      ],
    });
    expect(result.sharesMinor).toEqual([0, 0]);
    expect(result.perItem[0]?.hasWeightMismatch).toBe(false);
  });

  it("accepts a zero claim weight for some claimants and still shows them in the item", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [
        {
          unitPriceMinor: 100,
          quantity: 1,
          claims: [
            { participantIndex: 0, weight: 1 },
            { participantIndex: 1, weight: 0 },
          ],
        },
      ],
    });
    expect(result.perItem[0]?.sharesMinor).toEqual([100, 0]);
  });

  it("handles the same set of claimants claiming two different items", () => {
    const result = splitByItems({
      participantCount: 2,
      items: [
        {
          unitPriceMinor: 50,
          quantity: 1,
          claims: [
            { participantIndex: 0, weight: 1 },
            { participantIndex: 1, weight: 1 },
          ],
        },
        {
          unitPriceMinor: 30,
          quantity: 1,
          claims: [
            { participantIndex: 0, weight: 1 },
            { participantIndex: 1, weight: 1 },
          ],
        },
      ],
    });
    expect(result.sharesMinor).toEqual([40, 40]);
  });

  it("rejects an empty items array", () => {
    expect(() => splitByItems({ participantCount: 2, items: [] })).toThrow("splitByItems");
  });

  it("rejects a participantCount that is not a positive integer", () => {
    expect(() =>
      splitByItems({
        participantCount: 0,
        items: [{ unitPriceMinor: 10, quantity: 1, claims: [] }],
      }),
    ).toThrow("splitByItems");
  });

  it("rejects a negative unitPriceMinor", () => {
    expect(() =>
      splitByItems({
        participantCount: 1,
        items: [{ unitPriceMinor: -10, quantity: 1, claims: [{ participantIndex: 0, weight: 1 }] }],
      }),
    ).toThrow("splitByItems");
  });

  it("rejects a non-positive quantity", () => {
    expect(() =>
      splitByItems({
        participantCount: 1,
        items: [{ unitPriceMinor: 10, quantity: 0, claims: [{ participantIndex: 0, weight: 1 }] }],
      }),
    ).toThrow("splitByItems");
  });

  it("rejects a participantIndex out of range", () => {
    expect(() =>
      splitByItems({
        participantCount: 1,
        items: [{ unitPriceMinor: 10, quantity: 1, claims: [{ participantIndex: 5, weight: 1 }] }],
      }),
    ).toThrow("splitByItems");
  });

  it("rejects a duplicate participantIndex within the same item", () => {
    expect(() =>
      splitByItems({
        participantCount: 2,
        items: [
          {
            unitPriceMinor: 10,
            quantity: 1,
            claims: [
              { participantIndex: 0, weight: 1 },
              { participantIndex: 0, weight: 1 },
            ],
          },
        ],
      }),
    ).toThrow("splitByItems");
  });

  it("rejects a negative claim weight", () => {
    expect(() =>
      splitByItems({
        participantCount: 1,
        items: [{ unitPriceMinor: 10, quantity: 1, claims: [{ participantIndex: 0, weight: -1 }] }],
      }),
    ).toThrow("splitByItems");
  });

  it("rejects an item whose claims are all zero-weight", () => {
    expect(() =>
      splitByItems({
        participantCount: 2,
        items: [
          {
            unitPriceMinor: 10,
            quantity: 1,
            claims: [
              { participantIndex: 0, weight: 0 },
              { participantIndex: 1, weight: 0 },
            ],
          },
        ],
      }),
    ).toThrow("splitByItems");
  });
});
