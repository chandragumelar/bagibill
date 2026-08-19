import { describe, expect, it } from "vitest";
import { computeExpenseBalance, computeGroupBalances } from "./compute-balances";

describe("computeExpenseBalance", () => {
  it("credits a single payer and debits the other two", () => {
    const result = computeExpenseBalance({ sharesMinor: [34, 33, 33], paymentsMinor: [100, 0, 0] });
    expect(result.netMinor).toEqual([66, -33, -33]);
    expect(result.totalPaidMinor).toBe(100);
    expect(result.totalOwedMinor).toBe(100);
  });

  it("nets out two payers with different amounts", () => {
    const result = computeExpenseBalance({ sharesMinor: [50, 50], paymentsMinor: [70, 30] });
    expect(result.netMinor).toEqual([20, -20]);
  });

  it("handles a payer who did not consume anything", () => {
    const result = computeExpenseBalance({ sharesMinor: [0, 50, 50], paymentsMinor: [100, 0, 0] });
    expect(result.netMinor).toEqual([100, -50, -50]);
  });

  it("nets a participant to zero when they paid exactly their own share", () => {
    const result = computeExpenseBalance({ sharesMinor: [40, 60], paymentsMinor: [40, 60] });
    expect(result.netMinor).toEqual([0, 0]);
  });

  it("handles a negative share from a discount while payments still balance", () => {
    const result = computeExpenseBalance({ sharesMinor: [-10, 60, 50], paymentsMinor: [100, 0, 0] });
    expect(result.netMinor).toEqual([110, -60, -50]);
  });

  it("keeps netMinor summing to exactly zero", () => {
    const result = computeExpenseBalance({ sharesMinor: [34, 33, 33], paymentsMinor: [100, 0, 0] });
    const sumMinor = result.netMinor.reduce((sum, net) => sum + net, 0);
    expect(sumMinor).toBe(0);
  });

  it("rejects an empty sharesMinor", () => {
    expect(() => computeExpenseBalance({ sharesMinor: [], paymentsMinor: [] })).toThrow("computeExpenseBalance");
  });

  it("rejects sharesMinor and paymentsMinor of different lengths", () => {
    expect(() => computeExpenseBalance({ sharesMinor: [50, 50], paymentsMinor: [100] })).toThrow(
      "computeExpenseBalance",
    );
  });

  it("rejects a fractional element in sharesMinor", () => {
    expect(() => computeExpenseBalance({ sharesMinor: [50.5, 49.5], paymentsMinor: [100, 0] })).toThrow(
      "computeExpenseBalance",
    );
  });

  it("rejects a non-finite element in paymentsMinor", () => {
    expect(() => computeExpenseBalance({ sharesMinor: [50, 50], paymentsMinor: [Infinity, 0] })).toThrow(
      "computeExpenseBalance",
    );
  });

  it("rejects a negative payment", () => {
    expect(() => computeExpenseBalance({ sharesMinor: [50, 50], paymentsMinor: [-10, 110] })).toThrow(
      "computeExpenseBalance",
    );
  });

  it("rejects total payments not matching total shares", () => {
    expect(() => computeExpenseBalance({ sharesMinor: [50, 50], paymentsMinor: [100, 10] })).toThrow(
      "computeExpenseBalance",
    );
  });

  it("accepts a negative share and does not reject it", () => {
    expect(() =>
      computeExpenseBalance({ sharesMinor: [-10, 60, 50], paymentsMinor: [100, 0, 0] }),
    ).not.toThrow();
  });
});

describe("computeGroupBalances", () => {
  const expensesWithDifferentPayers = [
    { sharesMinor: [34, 33, 33], paymentsMinor: [100, 0, 0] },
    { sharesMinor: [0, 50, 50], paymentsMinor: [0, 100, 0] },
    { sharesMinor: [20, 20, 20], paymentsMinor: [0, 0, 60] },
  ];

  it("sums net balances across three expenses with different payers", () => {
    const result = computeGroupBalances({ participantCount: 3, expenses: expensesWithDifferentPayers });
    expect(result.netMinor).toEqual([46, -3, -43]);
    expect(result.totalPaidMinor).toBe(260);
    expect(result.totalOwedMinor).toBe(260);
  });

  it("keeps a participant who is zero in every expense in the result with a zero net", () => {
    const expenses = expensesWithDifferentPayers.map((expense) => ({
      sharesMinor: [...expense.sharesMinor, 0],
      paymentsMinor: [...expense.paymentsMinor, 0],
    }));
    const result = computeGroupBalances({ participantCount: 4, expenses });
    expect(result.netMinor).toEqual([46, -3, -43, 0]);
    expect(result.netMinor.length).toBe(4);
  });

  it("keeps netMinor summing to exactly zero at the group level", () => {
    const result = computeGroupBalances({ participantCount: 3, expenses: expensesWithDifferentPayers });
    const sumMinor = result.netMinor.reduce((sum, net) => sum + net, 0);
    expect(sumMinor).toBe(0);
  });

  it("rejects a non-positive participantCount", () => {
    expect(() =>
      computeGroupBalances({ participantCount: 0, expenses: expensesWithDifferentPayers }),
    ).toThrow("computeGroupBalances");
  });

  it("rejects an empty expenses array", () => {
    expect(() => computeGroupBalances({ participantCount: 3, expenses: [] })).toThrow("computeGroupBalances");
  });

  it("rejects an expense whose array length does not match participantCount", () => {
    expect(() =>
      computeGroupBalances({
        participantCount: 3,
        expenses: [{ sharesMinor: [50, 50], paymentsMinor: [100, 0] }],
      }),
    ).toThrow("computeGroupBalances");
  });
});

// PRNG kecil dengan seed tetap biar kegagalan property test bisa direproduksi
// tanpa nebak — mulberry32, bukan dependency baru. Pola sama dengan
// allocate-by-weights.test.ts.
function mulberry32(seed: number): () => number {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomShareMinor(random: () => number): number {
  const magnitude = randomInt(random, 0, 100_000);
  const isNegative = random() < 0.2;
  return isNegative ? -magnitude : magnitude;
}

// Random non-negative integers summing exactly to totalMinor, via random cut
// points on [0, totalMinor] — payments must never be negative, so this only
// runs once totalMinor itself is known to be non-negative.
function randomPaymentsMinor(random: () => number, participantCount: number, totalMinor: number): number[] {
  if (participantCount === 1) return [totalMinor];

  const cuts = Array.from({ length: participantCount - 1 }, () => randomInt(random, 0, totalMinor)).sort(
    (a, b) => a - b,
  );
  const paymentsMinor: number[] = [];
  let previousCut = 0;
  for (const cut of cuts) {
    paymentsMinor.push(cut - previousCut);
    previousCut = cut;
  }
  paymentsMinor.push(totalMinor - previousCut);
  return paymentsMinor;
}

// Non-negative payments can never sum to a negative total, so shares whose
// total lands negative are regenerated until it doesn't — mirrors the
// rejection-sampling loop in allocate-by-weights.test.ts's
// generateWeightHundredths.
function randomBalancedExpense(
  random: () => number,
  participantCount: number,
): { sharesMinor: number[]; paymentsMinor: number[] } {
  while (true) {
    const sharesMinor = Array.from({ length: participantCount }, () => randomShareMinor(random));
    const totalSharesMinor = sharesMinor.reduce((sum, value) => sum + value, 0);
    if (totalSharesMinor < 0) continue;
    const paymentsMinor = randomPaymentsMinor(random, participantCount, totalSharesMinor);
    return { sharesMinor, paymentsMinor };
  }
}

describe("computeGroupBalances — property", () => {
  const SEED = 4242;
  const ITERATIONS = 5000;

  it(`keeps every group's net balances summing to zero across ${ITERATIONS} random cases (seed ${SEED})`, () => {
    const random = mulberry32(SEED);

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const participantCount = randomInt(random, 1, 20);
      const expenseCount = randomInt(random, 1, 10);
      const expenses = Array.from({ length: expenseCount }, () => randomBalancedExpense(random, participantCount));
      const context = `seed=${SEED} iteration=${iteration} participantCount=${participantCount} expenses=${JSON.stringify(expenses)}`;

      const result = computeGroupBalances({ participantCount, expenses });
      const repeat = computeGroupBalances({ participantCount, expenses });

      expect(result.netMinor.length, context).toBe(participantCount);
      expect(
        result.netMinor.reduce((sum, net) => sum + net, 0),
        context,
      ).toBe(0);
      for (const net of result.netMinor) {
        expect(Number.isInteger(net), context).toBe(true);
      }
      expect(result.totalPaidMinor, context).toBe(result.totalOwedMinor);
      expect(repeat, context).toEqual(result);
    }
  });
});
