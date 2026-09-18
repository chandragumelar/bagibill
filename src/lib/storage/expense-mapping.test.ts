import { describe, expect, it } from "vitest";
import { calculateExpense } from "@bagibill/split-engine";
import { mapSharesToMembers, resolveMemberOrder, toCalculationInput } from "./expense-mapping";
import { convertMinorToBaseCurrency } from "./expense-currency";
import type { ExpenseRecord, SplitDataRecord } from "./records";

function baseExpense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Test",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 30_000,
    payers: [{ memberId: "m1", amountMinor: 30_000 }],
    splitData: { mode: "evenly", memberIds: ["m1", "m2", "m3"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "device-1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

describe("resolveMemberOrder", () => {
  it.each<[string, SplitDataRecord]>([
    ["evenly", { mode: "evenly", memberIds: ["m1", "m2"] }],
    [
      "byAmounts",
      {
        mode: "byAmounts",
        entries: [
          { memberId: "m1", amountMinor: 1 },
          { memberId: "m2", amountMinor: 2 },
        ],
      },
    ],
    [
      "byPercentage",
      {
        mode: "byPercentage",
        entries: [
          { memberId: "m1", percent: 50 },
          { memberId: "m2", percent: 50 },
        ],
      },
    ],
    [
      "byWeights",
      {
        mode: "byWeights",
        entries: [
          { memberId: "m1", weight: 1 },
          { memberId: "m2", weight: 1 },
        ],
      },
    ],
    [
      "byAdjustment",
      {
        mode: "byAdjustment",
        entries: [
          { memberId: "m1", adjustmentMinor: 0 },
          { memberId: "m2", adjustmentMinor: 0 },
        ],
      },
    ],
    ["byItems", { mode: "byItems", memberIds: ["m1", "m2"] }],
  ])("returns memberIds in order for mode %s", (_mode, splitData) => {
    expect(resolveMemberOrder(splitData)).toEqual(["m1", "m2"]);
  });
});

describe("round-trip per mode", () => {
  it("converts foreign-currency totals into the group's base currency", () => {
    const expense = baseExpense({
      currency: "USD",
      fxRate: 15_800,
      amountTotalMinor: 1_000,
      payers: [{ memberId: "m1", amountMinor: 1_000 }],
    });

    const input = toCalculationInput(expense, "IDR");

    expect(input.totalMinor).toBe(158_000);
    expect(input.paymentsMinor).toEqual([158_000, 0, 0]);
  });

  it("keeps same-currency amounts unchanged", () => {
    const input = toCalculationInput(baseExpense({ amountTotalMinor: 12_345 }));
    expect(input.totalMinor).toBe(12_345);
  });

  it("rounds converted fractional minor units half away from zero", () => {
    expect(convertMinorToBaseCurrency({ amountMinor: 1, fromCurrency: "USD", baseCurrency: "IDR", fxRate: 150 })).toBe(2);
    expect(convertMinorToBaseCurrency({ amountMinor: -1, fromCurrency: "USD", baseCurrency: "IDR", fxRate: 150 })).toBe(-2);
  });

  it("converts three-decimal currency into zero- and two-decimal currencies", () => {
    expect(convertMinorToBaseCurrency({ amountMinor: 1_001, fromCurrency: "KWD", baseCurrency: "IDR", fxRate: 5_000 })).toBe(5_005);
    expect(convertMinorToBaseCurrency({ amountMinor: 1_001, fromCurrency: "KWD", baseCurrency: "USD", fxRate: 2.5 })).toBe(250);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid fxRate %s with context", (fxRate) => {
    expect(() => toCalculationInput(baseExpense({ currency: "USD", fxRate, amountTotalMinor: 100 }), "IDR"))
      .toThrow(/Invalid fxRate.*USD.*IDR/);
  });

  it("rejects a missing fxRate instead of reinterpreting stored foreign data", () => {
    const malformed = { ...baseExpense({ currency: "USD", amountTotalMinor: 100 }) };
    Reflect.deleteProperty(malformed, "fxRate");
    expect(() => toCalculationInput(malformed, "IDR")).toThrow(/Invalid fxRate.*USD.*IDR/);
  });

  it("uses stored snapshot rate and manual override deterministically", () => {
    const expense = baseExpense({ currency: "USD", fxRate: 15_800, amountTotalMinor: 1_000 });
    const changedProviderRate = 16_000;
    expect(toCalculationInput(expense, "IDR").totalMinor).toBe(158_000);
    expect(toCalculationInput({ ...expense, fxRate: changedProviderRate }, "IDR").totalMinor).toBe(160_000);
  });

  it("converts nominal split, fixed charge, partial treat, and item price at mapping boundary", () => {
    const expense = baseExpense({
      currency: "USD",
      fxRate: 15_800,
      amountTotalMinor: 1_000,
      payers: [{ memberId: "m1", amountMinor: 1_000 }],
      splitData: {
        mode: "byAmounts",
        entries: [
          { memberId: "m1", amountMinor: 500 },
          { memberId: "m2", amountMinor: 500 },
          { memberId: "m3", amountMinor: 0 },
        ],
      },
      charges: [{ amount: { kind: "fixed", amountMinor: 100 }, allocation: { mode: "even" } }],
      treats: [{ kind: "partial", sponsorMemberId: "m1", beneficiaryMemberId: "m2", amountMinor: 100 }],
      items: [{ itemId: "i1", name: "Item", unitPriceMinor: 1_000, quantity: 1, claims: [] }],
    });
    const input = toCalculationInput(expense, "IDR");

    expect(input.totalMinor).toBe(158_000);
    expect(input.split).toEqual({ mode: "byAmounts", amountsMinor: [79_000, 79_000, 0] });
    expect(input.charges).toEqual([{ amount: { kind: "fixed", amountMinor: 15_800 }, allocation: { mode: "even" } }]);
    expect(input.treats).toEqual([{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 15_800 }]);
    expect(input.paymentsMinor).toEqual([158_000, 0, 0]);
  });

  it("passes converted total and payments to engine with exact shares", () => {
    const expense = baseExpense({
      currency: "USD",
      fxRate: 15_800,
      amountTotalMinor: 1_000,
      payers: [{ memberId: "m1", amountMinor: 1_000 }],
    });
    const calculation = calculateExpense(toCalculationInput(expense, "IDR"));
    expect(calculation.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(158_000);
    expect(calculation.netMinor?.reduce((sum, netMinor) => sum + netMinor, 0)).toBe(0);
  });

  it("mode evenly: shares split equally and sum to the total", () => {
    const expense = baseExpense();
    const calc = calculateExpense(toCalculationInput(expense));
    const byMember = mapSharesToMembers(calc.sharesMinor, resolveMemberOrder(expense.splitData));
    expect([...byMember.values()].reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(30_000);
    expect(byMember.get("m1")).toBe(10_000);
  });

  it("mode byAmounts: each member gets their own amount back", () => {
    const expense = baseExpense({
      splitData: {
        mode: "byAmounts",
        entries: [
          { memberId: "m1", amountMinor: 10_000 },
          { memberId: "m2", amountMinor: 15_000 },
          { memberId: "m3", amountMinor: 5_000 },
        ],
      },
    });
    const calc = calculateExpense(toCalculationInput(expense));
    const byMember = mapSharesToMembers(calc.sharesMinor, resolveMemberOrder(expense.splitData));
    expect(byMember.get("m2")).toBe(15_000);
  });

  it("mode byPercentage: shares follow the given percentages", () => {
    const expense = baseExpense({
      splitData: {
        mode: "byPercentage",
        entries: [
          { memberId: "m1", percent: 50 },
          { memberId: "m2", percent: 30 },
          { memberId: "m3", percent: 20 },
        ],
      },
    });
    const calc = calculateExpense(toCalculationInput(expense));
    const byMember = mapSharesToMembers(calc.sharesMinor, resolveMemberOrder(expense.splitData));
    expect(byMember.get("m1")).toBe(15_000);
  });

  it("mode byWeights: shares follow the given weights", () => {
    const expense = baseExpense({
      splitData: {
        mode: "byWeights",
        entries: [
          { memberId: "m1", weight: 1 },
          { memberId: "m2", weight: 1 },
          { memberId: "m3", weight: 2 },
        ],
      },
    });
    const calc = calculateExpense(toCalculationInput(expense));
    const byMember = mapSharesToMembers(calc.sharesMinor, resolveMemberOrder(expense.splitData));
    expect(byMember.get("m3")).toBe(15_000);
  });

  it("mode byAdjustment: even split plus each member's own adjustment", () => {
    const expense = baseExpense({
      splitData: {
        mode: "byAdjustment",
        entries: [
          { memberId: "m1", adjustmentMinor: 3_000 },
          { memberId: "m2", adjustmentMinor: -3_000 },
          { memberId: "m3", adjustmentMinor: 0 },
        ],
      },
    });
    const calc = calculateExpense(toCalculationInput(expense));
    const byMember = mapSharesToMembers(calc.sharesMinor, resolveMemberOrder(expense.splitData));
    expect(byMember.get("m1")).toBe(13_000);
    expect(byMember.get("m2")).toBe(7_000);
  });

  it("mode byItems: shares follow item claims", () => {
    const expense = baseExpense({
      amountTotalMinor: 40_000,
      payers: [{ memberId: "m1", amountMinor: 40_000 }],
      splitData: { mode: "byItems", memberIds: ["m1", "m2", "m3"] },
      items: [
        {
          itemId: "i1",
          name: "Nasi",
          unitPriceMinor: 30_000,
          quantity: 1,
          claims: [
            { memberId: "m1", weight: 1 },
            { memberId: "m2", weight: 1 },
          ],
        },
        {
          itemId: "i2",
          name: "Teh",
          unitPriceMinor: 10_000,
          quantity: 1,
          claims: [{ memberId: "m3", weight: 1 }],
        },
      ],
    });
    const calc = calculateExpense(toCalculationInput(expense));
    const byMember = mapSharesToMembers(calc.sharesMinor, resolveMemberOrder(expense.splitData));
    expect(byMember.get("m3")).toBe(10_000);
    expect(byMember.get("m1")).toBe(15_000);
  });
});

describe("index order tracks splitData, not the group's current member order", () => {
  it("computes the same per-member amount whether that member is listed first or last", () => {
    const buildSplitData = (order: readonly string[]): SplitDataRecord => ({
      mode: "byWeights",
      entries: order.map((memberId) => ({ memberId, weight: memberId === "m2" ? 2 : 1 })),
    });

    const expenseOrderA = baseExpense({ splitData: buildSplitData(["m1", "m2", "m3"]) });
    const expenseOrderB = baseExpense({ splitData: buildSplitData(["m3", "m2", "m1"]) });

    const calcA = calculateExpense(toCalculationInput(expenseOrderA));
    const calcB = calculateExpense(toCalculationInput(expenseOrderB));

    const byMemberA = mapSharesToMembers(calcA.sharesMinor, resolveMemberOrder(expenseOrderA.splitData));
    const byMemberB = mapSharesToMembers(calcB.sharesMinor, resolveMemberOrder(expenseOrderB.splitData));

    expect(byMemberA.get("m1")).toBe(byMemberB.get("m1"));
    expect(byMemberA.get("m2")).toBe(byMemberB.get("m2"));
    expect(byMemberA.get("m3")).toBe(byMemberB.get("m3"));
  });
});

describe("mapSharesToMembers", () => {
  it("pairs shares with memberIds by position", () => {
    const result = mapSharesToMembers([1_000, 2_000, 3_000], ["m1", "m2", "m3"]);
    expect(result.get("m1")).toBe(1_000);
    expect(result.get("m2")).toBe(2_000);
    expect(result.get("m3")).toBe(3_000);
  });

  it("throws when shares and memberOrder lengths do not match", () => {
    expect(() => mapSharesToMembers([1_000], ["m1", "m2"])).toThrow(/length/);
  });
});

describe("rejected references", () => {
  it("rejects a payer memberId that is not a split participant", () => {
    const expense = baseExpense({ payers: [{ memberId: "ghost", amountMinor: 30_000 }] });
    expect(() => toCalculationInput(expense)).toThrow(/ghost/);
  });

  it("rejects an item claim memberId that is not a split participant", () => {
    const expense = baseExpense({
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "byItems", memberIds: ["m1", "m2"] },
      items: [
        {
          itemId: "i1",
          name: "Nasi",
          unitPriceMinor: 10_000,
          quantity: 1,
          claims: [{ memberId: "ghost", weight: 1 }],
        },
      ],
    });
    expect(() => toCalculationInput(expense)).toThrow(/ghost/);
  });

  it("rejects a charge that targets an itemId not on the expense", () => {
    const expense = baseExpense({
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "byItems", memberIds: ["m1", "m2"] },
      items: [
        {
          itemId: "i1",
          name: "Nasi",
          unitPriceMinor: 10_000,
          quantity: 1,
          claims: [{ memberId: "m1", weight: 1 }],
        },
      ],
      charges: [
        {
          amount: { kind: "fixed", amountMinor: -1_000 },
          allocation: { mode: "items", itemIds: ["ghost-item"] },
        },
      ],
    });
    expect(() => toCalculationInput(expense)).toThrow(/ghost-item/);
  });

  it("rejects a treat that targets an itemId not on the expense", () => {
    const expense = baseExpense({
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "byItems", memberIds: ["m1", "m2"] },
      items: [
        {
          itemId: "i1",
          name: "Nasi",
          unitPriceMinor: 10_000,
          quantity: 1,
          claims: [{ memberId: "m1", weight: 1 }],
        },
      ],
      treats: [{ kind: "item", sponsorMemberId: "m1", itemIds: ["ghost-item"] }],
    });
    expect(() => toCalculationInput(expense)).toThrow(/ghost-item/);
  });
});
