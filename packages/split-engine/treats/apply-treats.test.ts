import { describe, expect, it } from "vitest";
import { applyTreats } from "./apply-treats";

describe("applyTreats", () => {
  it("moves the entire beneficiary share to the sponsor for a person treat", () => {
    const result = applyTreats({
      sharesMinor: [50, 30],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });
    expect(result.sharesMinor).toEqual([80, 0]);
    expect(result.transfers).toEqual([{ sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 30 }]);
  });

  it("moves only the fixed amount for a partial treat, leaving the remainder with the beneficiary", () => {
    const result = applyTreats({
      sharesMinor: [50, 30],
      treats: [{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 10 }],
    });
    expect(result.sharesMinor).toEqual([60, 20]);
  });

  it("moves every other claimant's share of a treated item to the sponsor", () => {
    const result = applyTreats({
      sharesMinor: [40, 50, 30],
      itemSharesMinor: [[10, 20, 0]],
      treats: [{ kind: "item", sponsorIndex: 2, itemIndices: [0] }],
    });
    expect(result.sharesMinor).toEqual([30, 30, 60]);
    expect(result.transfers).toEqual([
      { sponsorIndex: 2, beneficiaryIndex: 0, amountMinor: 10 },
      { sponsorIndex: 2, beneficiaryIndex: 1, amountMinor: 20 },
    ]);
  });

  it("applies two treats from the same sponsor to two different beneficiaries, recording both transfers in order", () => {
    const result = applyTreats({
      sharesMinor: [100, 20, 30],
      treats: [
        { kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 },
        { kind: "person", sponsorIndex: 0, beneficiaryIndex: 2 },
      ],
    });
    expect(result.sharesMinor).toEqual([150, 0, 0]);
    expect(result.transfers).toEqual([
      { sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 20 },
      { sponsorIndex: 0, beneficiaryIndex: 2, amountMinor: 30 },
    ]);
    for (const transfer of result.transfers) {
      expect(transfer.amountMinor).toBeGreaterThan(0);
    }
  });

  it("keeps a treated beneficiary in the result array at the same index with a zero share", () => {
    const result = applyTreats({
      sharesMinor: [50, 30],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });
    expect(result.sharesMinor.length).toBe(2);
    expect(result.sharesMinor[1]).toBe(0);
  });

  it("keeps the sum of shares exactly equal before and after a mix of treats", () => {
    const beforeSumMinor = 50 + 30 + 20 + 40;
    const result = applyTreats({
      sharesMinor: [50, 30, 20, 40],
      treats: [
        { kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 },
        { kind: "partial", sponsorIndex: 2, beneficiaryIndex: 3, amountMinor: 15 },
      ],
    });
    expect(result.sharesMinor).toEqual([80, 0, 35, 25]);
    const afterSumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(afterSumMinor).toBe(beforeSumMinor);
  });

  it("processes chained treats over the running result, not transitively: A treats B, then B treats C", () => {
    const result = applyTreats({
      sharesMinor: [10, 20, 30],
      treats: [
        { kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 },
        { kind: "person", sponsorIndex: 1, beneficiaryIndex: 2 },
      ],
    });
    expect(result.sharesMinor).toEqual([30, 30, 0]);
  });

  it("processes a circular treat (A treats B, B treats A) deterministically while keeping the sum exact", () => {
    const result = applyTreats({
      sharesMinor: [10, 20],
      treats: [
        { kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 },
        { kind: "person", sponsorIndex: 1, beneficiaryIndex: 0 },
      ],
    });
    expect(result.sharesMinor).toEqual([0, 30]);
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(30);
  });

  it("leaves the beneficiary negative when a partial treat exceeds their share, with a negative_share warning at the right index", () => {
    const result = applyTreats({
      sharesMinor: [10, 5],
      treats: [{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 20 }],
    });
    expect(result.sharesMinor).toEqual([30, -15]);
    expect(result.warnings).toEqual([{ code: "negative_share", indices: [1] }]);
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(15);
  });

  it("records zero transfer for a beneficiary whose share is already zero", () => {
    const result = applyTreats({
      sharesMinor: [10, 0],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });
    expect(result.sharesMinor).toEqual([10, 0]);
    expect(result.transfers).toEqual([]);
  });

  it("records zero transfer and leaves the share unchanged for a beneficiary already negative", () => {
    const result = applyTreats({
      sharesMinor: [10, -5],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });
    expect(result.sharesMinor).toEqual([10, -5]);
    expect(result.transfers).toEqual([]);
  });

  it("records no self-transfer when the sponsor is also a claimant of the treated item", () => {
    const result = applyTreats({
      sharesMinor: [30, 50],
      itemSharesMinor: [[10, 20]],
      treats: [{ kind: "item", sponsorIndex: 1, itemIndices: [0] }],
    });
    expect(result.transfers).toEqual([{ sponsorIndex: 1, beneficiaryIndex: 0, amountMinor: 10 }]);
    expect(result.transfers.some((transfer) => transfer.beneficiaryIndex === transfer.sponsorIndex)).toBe(false);
  });

  it("sums claims across two treated items", () => {
    const result = applyTreats({
      sharesMinor: [20, 30],
      itemSharesMinor: [
        [5, 10],
        [3, 7],
      ],
      treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [0, 1] }],
    });
    expect(result.sharesMinor).toEqual([37, 13]);
    expect(result.transfers).toEqual([{ sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 17 }]);
  });

  it("works with exactly two participants", () => {
    const result = applyTreats({
      sharesMinor: [40, 10],
      treats: [{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 5 }],
    });
    expect(result.sharesMinor).toEqual([45, 5]);
  });

  it("rejects an empty sharesMinor", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [],
        treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a fractional element in sharesMinor", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10.5, 20],
        treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects an empty treats array", () => {
    expect(() => applyTreats({ sharesMinor: [10, 20], treats: [] })).toThrow("applyTreats");
  });

  it("rejects a sponsorIndex out of range", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "person", sponsorIndex: 5, beneficiaryIndex: 1 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a non-integer beneficiaryIndex", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 0.5 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a treat where sponsorIndex equals beneficiaryIndex", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 0 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a zero partial amountMinor", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 0 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a negative partial amountMinor", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: -5 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a fractional partial amountMinor", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 5.5 }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects an item treat when itemSharesMinor is not provided", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [0] }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects empty itemIndices for an item treat", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        itemSharesMinor: [[5, 5]],
        treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [] }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects an itemIndex out of range", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        itemSharesMinor: [[5, 5]],
        treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [5] }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a duplicate itemIndex within the same treat", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        itemSharesMinor: [[5, 5]],
        treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [0, 0] }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects a non-integer itemIndex", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20],
        itemSharesMinor: [[5, 5]],
        treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [0.5] }],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects the same itemIndex being treated by two different item treats", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 10],
        itemSharesMinor: [[5, 5]],
        treats: [
          { kind: "item", sponsorIndex: 0, itemIndices: [0] },
          { kind: "item", sponsorIndex: 1, itemIndices: [0] },
        ],
      }),
    ).toThrow("applyTreats");
  });

  it("rejects an itemSharesMinor row whose length does not match sharesMinor", () => {
    expect(() =>
      applyTreats({
        sharesMinor: [10, 20, 30],
        itemSharesMinor: [[5, 5]],
        treats: [{ kind: "item", sponsorIndex: 0, itemIndices: [0] }],
      }),
    ).toThrow("applyTreats");
  });
});
