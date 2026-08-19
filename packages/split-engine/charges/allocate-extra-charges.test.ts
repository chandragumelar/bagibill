import { describe, expect, it } from "vitest";
import { allocateExtraCharges } from "./allocate-extra-charges";

describe("allocateExtraCharges", () => {
  it("allocates a single fixed charge proportionally", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [60, 40],
      charges: [{ amount: { kind: "fixed", amountMinor: 20 }, allocation: { mode: "proportional" } }],
    });
    expect(result.perCharge[0]?.chargeTotalMinor).toBe(20);
    expect(result.totalSharesMinor).toEqual([72, 48]);
    expect(result.subtotalMinor).toBe(100);
    expect(result.chargesTotalMinor).toBe(20);
  });

  it("allocates a single percent charge from the subtotal", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50, 50],
      charges: [
        { amount: { kind: "percent", percent: 10, basis: "subtotal" }, allocation: { mode: "proportional" } },
      ],
    });
    expect(result.perCharge[0]?.chargeTotalMinor).toBe(10);
    expect(result.totalSharesMinor).toEqual([55, 55]);
  });

  it("splits a charge evenly regardless of base shares", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [70, 30],
      charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "even" } }],
    });
    expect(result.totalSharesMinor).toEqual([75, 35]);
  });

  it("puts the entire single_payer charge on one participant and zero on everyone else", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [40, 60],
      charges: [
        { amount: { kind: "fixed", amountMinor: 15 }, allocation: { mode: "single_payer", participantIndex: 1 } },
      ],
    });
    expect(result.perCharge[0]?.sharesMinor).toEqual([0, 15]);
    expect(result.totalSharesMinor).toEqual([40, 75]);
  });

  it("computes the Indonesian order: service charge from subtotal, then PB1 from subtotal plus service", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [200000],
      charges: [
        { amount: { kind: "percent", percent: 5, basis: "subtotal" }, allocation: { mode: "proportional" } },
        { amount: { kind: "percent", percent: 10, basis: "running_total" }, allocation: { mode: "proportional" } },
      ],
    });
    expect(result.perCharge[0]?.chargeTotalMinor).toBe(10000);
    expect(result.perCharge[1]?.chargeTotalMinor).toBe(21000);
  });

  it("computes a different PB1 amount when its basis is subtotal instead of running_total", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [200000],
      charges: [
        { amount: { kind: "percent", percent: 5, basis: "subtotal" }, allocation: { mode: "proportional" } },
        { amount: { kind: "percent", percent: 10, basis: "subtotal" }, allocation: { mode: "proportional" } },
      ],
    });
    expect(result.perCharge[1]?.chargeTotalMinor).toBe(20000);
  });

  it("keeps totalSharesMinor exactly equal to subtotal plus charges across three different allocation modes", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [37, 29, 34],
      charges: [
        { amount: { kind: "fixed", amountMinor: 17 }, allocation: { mode: "proportional" } },
        { amount: { kind: "percent", percent: 6.5, basis: "subtotal" }, allocation: { mode: "even" } },
        { amount: { kind: "fixed", amountMinor: -9 }, allocation: { mode: "single_payer", participantIndex: 1 } },
      ],
    });
    const sumMinor = result.totalSharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(result.subtotalMinor + result.chargesTotalMinor);
  });

  it("applies a negative fixed discount proportionally", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [60, 40],
      charges: [{ amount: { kind: "fixed", amountMinor: -20 }, allocation: { mode: "proportional" } }],
    });
    expect(result.totalSharesMinor).toEqual([48, 32]);
    expect(result.chargesTotalMinor).toBe(-20);
  });

  it("applies a negative percent discount", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50, 50],
      charges: [
        { amount: { kind: "percent", percent: -10, basis: "subtotal" }, allocation: { mode: "proportional" } },
      ],
    });
    expect(result.totalSharesMinor).toEqual([45, 45]);
  });

  it("applies an items-mode discount only to the claimants of the discounted items", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [15, 25, 30],
      itemSharesMinor: [
        [10, 0, 0],
        [0, 20, 0],
        [5, 5, 0],
        [0, 0, 30],
      ],
      charges: [
        { amount: { kind: "fixed", amountMinor: -20 }, allocation: { mode: "items", itemIndices: [0, 2] } },
      ],
    });
    expect(result.perCharge[0]?.sharesMinor).toEqual([-15, -5, 0]);
    expect(result.totalSharesMinor).toEqual([0, 20, 30]);
  });

  it("leaves a discount larger than a participant's base share negative and warns with the right index", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [30, 70],
      charges: [
        { amount: { kind: "fixed", amountMinor: -50 }, allocation: { mode: "single_payer", participantIndex: 0 } },
      ],
    });
    expect(result.totalSharesMinor).toEqual([-20, 70]);
    expect(result.warnings).toEqual([{ code: "negative_share", indices: [0] }]);
    const sumMinor = result.totalSharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(result.subtotalMinor + result.chargesTotalMinor);
  });

  it("allocates a charge for a single participant", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [100],
      charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "proportional" } }],
    });
    expect(result.totalSharesMinor).toEqual([110]);
  });

  it("accepts a zero fixed charge amount", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50, 50],
      charges: [{ amount: { kind: "fixed", amountMinor: 0 }, allocation: { mode: "proportional" } }],
    });
    expect(result.totalSharesMinor).toEqual([50, 50]);
  });

  it("accepts a zero percent", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50, 50],
      charges: [{ amount: { kind: "percent", percent: 0, basis: "subtotal" }, allocation: { mode: "even" } }],
    });
    expect(result.totalSharesMinor).toEqual([50, 50]);
  });

  it("accepts a percent above 100", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50, 50],
      charges: [
        { amount: { kind: "percent", percent: 150, basis: "subtotal" }, allocation: { mode: "proportional" } },
      ],
    });
    expect(result.perCharge[0]?.chargeTotalMinor).toBe(150);
    expect(result.totalSharesMinor).toEqual([125, 125]);
  });

  it("rounds a positive half-unit result away from zero", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50],
      charges: [{ amount: { kind: "percent", percent: 5, basis: "subtotal" }, allocation: { mode: "proportional" } }],
    });
    expect(result.perCharge[0]?.chargeTotalMinor).toBe(3);
  });

  it("rounds a negative half-unit result away from zero", () => {
    const result = allocateExtraCharges({
      baseSharesMinor: [50],
      charges: [
        { amount: { kind: "percent", percent: -5, basis: "subtotal" }, allocation: { mode: "proportional" } },
      ],
    });
    expect(result.perCharge[0]?.chargeTotalMinor).toBe(-3);
  });

  it("rejects an empty baseSharesMinor", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [],
        charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "even" } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a fractional element in baseSharesMinor", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [50.5, 49.5],
        charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "even" } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a negative baseSharesMinor element combined with a proportional charge", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [-10, 110],
        charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "proportional" } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects all-zero baseSharesMinor combined with a proportional charge", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [0, 0],
        charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "proportional" } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects an empty charges array", () => {
    expect(() => allocateExtraCharges({ baseSharesMinor: [100], charges: [] })).toThrow("allocateExtraCharges");
  });

  it("rejects a fractional amountMinor", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        charges: [{ amount: { kind: "fixed", amountMinor: 10.5 }, allocation: { mode: "proportional" } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a percent with more than two decimal places", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        charges: [
          { amount: { kind: "percent", percent: 5.555, basis: "subtotal" }, allocation: { mode: "proportional" } },
        ],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a non-finite percent", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        charges: [
          { amount: { kind: "percent", percent: Infinity, basis: "subtotal" }, allocation: { mode: "proportional" } },
        ],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a single_payer participantIndex out of range", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        charges: [
          { amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "single_payer", participantIndex: 5 } },
        ],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a non-integer single_payer participantIndex", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        charges: [
          { amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "single_payer", participantIndex: 0.5 } },
        ],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects empty itemIndices for mode items", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        itemSharesMinor: [[100]],
        charges: [{ amount: { kind: "fixed", amountMinor: -10 }, allocation: { mode: "items", itemIndices: [] } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects an itemIndex out of range for mode items", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        itemSharesMinor: [[100]],
        charges: [{ amount: { kind: "fixed", amountMinor: -10 }, allocation: { mode: "items", itemIndices: [5] } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a duplicate itemIndex for mode items", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        itemSharesMinor: [[100]],
        charges: [
          { amount: { kind: "fixed", amountMinor: -10 }, allocation: { mode: "items", itemIndices: [0, 0] } },
        ],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects a non-integer itemIndex for mode items", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        itemSharesMinor: [[100]],
        charges: [
          { amount: { kind: "fixed", amountMinor: -10 }, allocation: { mode: "items", itemIndices: [0.5] } },
        ],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects mode items when itemSharesMinor is not provided", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        charges: [{ amount: { kind: "fixed", amountMinor: -10 }, allocation: { mode: "items", itemIndices: [0] } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects mode items when the charge amount is positive", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [100],
        itemSharesMinor: [[100]],
        charges: [{ amount: { kind: "fixed", amountMinor: 10 }, allocation: { mode: "items", itemIndices: [0] } }],
      }),
    ).toThrow("allocateExtraCharges");
  });

  it("rejects an itemSharesMinor row whose length does not match baseSharesMinor", () => {
    expect(() =>
      allocateExtraCharges({
        baseSharesMinor: [50, 50],
        itemSharesMinor: [[100, 0, 50]],
        charges: [{ amount: { kind: "fixed", amountMinor: -10 }, allocation: { mode: "items", itemIndices: [0] } }],
      }),
    ).toThrow("allocateExtraCharges");
  });
});
