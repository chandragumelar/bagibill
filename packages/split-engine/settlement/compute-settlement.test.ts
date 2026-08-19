import { describe, expect, it } from "vitest";
import { computeSettlement } from "./compute-settlement";
import { computeGroupBalances } from "../balance/compute-balances";
import type { ExpenseLedger } from "../balance/balance.types";
import type { Transfer } from "./settlement.types";

describe("computeSettlement — direct mode", () => {
  it("produces two transfers to the single payer of a three-way even split", () => {
    const expenses = [{ sharesMinor: [34, 33, 33], paymentsMinor: [100, 0, 0] }];
    const result = computeSettlement({ participantCount: 3, expenses, mode: "direct" });
    expect(result.transfers).toEqual([
      { fromIndex: 1, toIndex: 0, amountMinor: 33 },
      { fromIndex: 2, toIndex: 0, amountMinor: 33 },
    ]);
  });

  it("nets opposite-direction pairs from two expenses into a single transfer", () => {
    const expenses = [
      { sharesMinor: [50, 50], paymentsMinor: [100, 0] },
      { sharesMinor: [80, 20], paymentsMinor: [0, 100] },
    ];
    const result = computeSettlement({ participantCount: 2, expenses, mode: "direct" });
    expect(result.pairwiseTransfers).toEqual([{ fromIndex: 0, toIndex: 1, amountMinor: 30 }]);
    expect(result.transfers).toEqual(result.pairwiseTransfers);
  });

  it("cancels out to an empty result when two expenses net to exactly zero", () => {
    const expenses = [
      { sharesMinor: [50, 50], paymentsMinor: [100, 0] },
      { sharesMinor: [50, 50], paymentsMinor: [0, 100] },
    ];
    const result = computeSettlement({ participantCount: 2, expenses, mode: "direct" });
    expect(result.transfers).toEqual([]);
    expect(result.pairwiseTransfers).toEqual([]);
  });

  it("handles a payer who did not consume anything", () => {
    const expenses = [{ sharesMinor: [0, 50, 50], paymentsMinor: [100, 0, 0] }];
    const result = computeSettlement({ participantCount: 3, expenses, mode: "direct" });
    expect(result.transfers).toEqual([
      { fromIndex: 1, toIndex: 0, amountMinor: 50 },
      { fromIndex: 2, toIndex: 0, amountMinor: 50 },
    ]);
  });
});

describe("computeSettlement — simplified mode", () => {
  it("produces clearly fewer transfers than the pairwise breakdown", () => {
    const expenses = [
      { sharesMinor: [100, 100, 100, 100], paymentsMinor: [400, 0, 0, 0] },
      { sharesMinor: [0, 30, 30, 0], paymentsMinor: [0, 60, 0, 0] },
    ];
    const result = computeSettlement({ participantCount: 4, expenses, mode: "simplified" });
    const pairwiseResult = computeSettlement({ participantCount: 4, expenses, mode: "direct" });

    expect(result.transfers).toEqual([
      { fromIndex: 2, toIndex: 0, amountMinor: 130 },
      { fromIndex: 3, toIndex: 0, amountMinor: 100 },
      { fromIndex: 1, toIndex: 0, amountMinor: 70 },
    ]);
    expect(pairwiseResult.pairwiseTransfers.length).toBe(4);
    expect(result.transfers.length).toBeLessThan(pairwiseResult.pairwiseTransfers.length);
  });

  it("collapses a three-person A-owes-B-owes-C chain into a single direct transfer", () => {
    const expenses = [
      { sharesMinor: [50, 50, 0], paymentsMinor: [100, 0, 0] },
      { sharesMinor: [0, 50, 50], paymentsMinor: [0, 100, 0] },
    ];
    const result = computeSettlement({ participantCount: 3, expenses, mode: "simplified" });
    const pairwiseResult = computeSettlement({ participantCount: 3, expenses, mode: "direct" });

    expect(result.transfers).toEqual([{ fromIndex: 2, toIndex: 0, amountMinor: 50 }]);
    expect(pairwiseResult.pairwiseTransfers).toEqual([
      { fromIndex: 1, toIndex: 0, amountMinor: 50 },
      { fromIndex: 2, toIndex: 1, amountMinor: 50 },
    ]);
  });
});

describe("computeSettlement — required invariants", () => {
  const fourParticipantExpenses = [
    { sharesMinor: [100, 100, 100, 100], paymentsMinor: [400, 0, 0, 0] },
    { sharesMinor: [0, 30, 30, 0], paymentsMinor: [0, 60, 0, 0] },
  ];

  it("zeroes out every participant's group net once every settlement transfer is applied, for both modes", () => {
    const groupBalance = computeGroupBalances({ participantCount: 4, expenses: fourParticipantExpenses });

    for (const mode of ["direct", "simplified"] as const) {
      const result = computeSettlement({ participantCount: 4, expenses: fourParticipantExpenses, mode });
      const finalNet = applyTransfers(groupBalance.netMinor, result.transfers);
      expect(finalNet.every((net) => net === 0), mode).toBe(true);
    }
  });

  it("keeps pairwiseTransfers populated in simplified mode, matching direct mode's result on the same input", () => {
    const directResult = computeSettlement({ participantCount: 4, expenses: fourParticipantExpenses, mode: "direct" });
    const simplifiedResult = computeSettlement({
      participantCount: 4,
      expenses: fourParticipantExpenses,
      mode: "simplified",
    });
    expect(simplifiedResult.pairwiseTransfers.length).toBeGreaterThan(0);
    expect(simplifiedResult.pairwiseTransfers).toEqual(directResult.pairwiseTransfers);
  });

  it("settles five participants and twenty transactions with at most four simplified transfers and a zero final balance", () => {
    const participantCount = 5;
    // Deterministic, formula-built fixture — not randomized — so the case
    // is reproducible by reading the code, not by re-running a seed.
    const expenses: ExpenseLedger[] = Array.from({ length: 20 }, (_, expenseIndex) => {
      const payerIndex = expenseIndex % participantCount;
      const totalMinor = 300 + 13 * expenseIndex;
      const sharesMinor = buildEvenShares(totalMinor, participantCount);
      const paymentsMinor = Array.from({ length: participantCount }, (_, index) =>
        index === payerIndex ? totalMinor : 0,
      );
      return { sharesMinor, paymentsMinor };
    });

    const result = computeSettlement({ participantCount, expenses, mode: "simplified" });
    const pairwiseResult = computeSettlement({ participantCount, expenses, mode: "direct" });

    expect(result.transfers.length).toBeLessThanOrEqual(participantCount - 1);
    expect(result.transfers.length).toBeLessThan(pairwiseResult.pairwiseTransfers.length);

    const groupBalance = computeGroupBalances({ participantCount, expenses });
    const finalNet = applyTransfers(groupBalance.netMinor, result.transfers);
    expect(finalNet.every((net) => net === 0)).toBe(true);
  });

  it("produces identical transfers when called twice with the same input, for both modes", () => {
    for (const mode of ["direct", "simplified"] as const) {
      const first = computeSettlement({ participantCount: 4, expenses: fourParticipantExpenses, mode });
      const second = computeSettlement({ participantCount: 4, expenses: fourParticipantExpenses, mode });
      expect(second).toEqual(first);
    }
  });

  it("keeps every amountMinor positive and never transfers from someone to themselves, in both modes", () => {
    for (const mode of ["direct", "simplified"] as const) {
      const result = computeSettlement({ participantCount: 4, expenses: fourParticipantExpenses, mode });
      for (const transfer of [...result.transfers, ...result.pairwiseTransfers]) {
        expect(transfer.amountMinor).toBeGreaterThan(0);
        expect(transfer.fromIndex).not.toBe(transfer.toIndex);
      }
    }
  });
});

describe("computeSettlement — batas", () => {
  it("produces empty results in both modes when everyone's net is already zero", () => {
    const expenses = [{ sharesMinor: [50, 50], paymentsMinor: [50, 50] }];
    for (const mode of ["direct", "simplified"] as const) {
      const result = computeSettlement({ participantCount: 2, expenses, mode });
      expect(result.transfers).toEqual([]);
      expect(result.pairwiseTransfers).toEqual([]);
    }
  });

  it("settles a simple two-participant expense", () => {
    const expenses = [{ sharesMinor: [40, 60], paymentsMinor: [100, 0] }];
    const result = computeSettlement({ participantCount: 2, expenses, mode: "direct" });
    expect(result.transfers).toEqual([{ fromIndex: 1, toIndex: 0, amountMinor: 60 }]);
  });

  it("splits a single debtor's debt across two creditors proportional to their surplus", () => {
    const expenses = [{ sharesMinor: [0, 0, 100], paymentsMinor: [33, 67, 0] }];
    const result = computeSettlement({ participantCount: 3, expenses, mode: "direct" });
    expect(result.pairwiseTransfers).toEqual([
      { fromIndex: 2, toIndex: 0, amountMinor: 33 },
      { fromIndex: 2, toIndex: 1, amountMinor: 67 },
    ]);
    const totalMinor = result.pairwiseTransfers.reduce((sum, transfer) => sum + transfer.amountMinor, 0);
    expect(totalMinor).toBe(100);
  });
});

describe("computeSettlement — ditolak", () => {
  const validExpenses = [{ sharesMinor: [50, 50], paymentsMinor: [50, 50] }];

  it("rejects a mode that is neither direct nor simplified", () => {
    // A same-family `as` cast (not `as unknown as`) to reach an invalid
    // member of the literal union — the point is exercising the runtime
    // guard, since a validly-typed call site can't produce this value.
    const invalidMode = "bogus" as "direct" | "simplified";
    expect(() =>
      computeSettlement({ participantCount: 2, expenses: validExpenses, mode: invalidMode }),
    ).toThrow("computeSettlement");
  });

  it("rejects an empty expenses array (via computeGroupBalances, left unwrapped)", () => {
    expect(() => computeSettlement({ participantCount: 2, expenses: [], mode: "direct" })).toThrow(
      "computeGroupBalances",
    );
  });

  it("rejects a non-positive participantCount", () => {
    expect(() =>
      computeSettlement({ participantCount: 0, expenses: validExpenses, mode: "direct" }),
    ).toThrow("computeGroupBalances");
  });

  it("rejects an expense whose array length does not match participantCount", () => {
    expect(() =>
      computeSettlement({
        participantCount: 3,
        expenses: [{ sharesMinor: [50, 50], paymentsMinor: [50, 50] }],
        mode: "direct",
      }),
    ).toThrow("computeGroupBalances");
  });

  it("rejects a fractional element in sharesMinor", () => {
    expect(() =>
      computeSettlement({
        participantCount: 2,
        expenses: [{ sharesMinor: [50.5, 49.5], paymentsMinor: [50, 50] }],
        mode: "direct",
      }),
    ).toThrow("computeGroupBalances");
  });

  it("rejects a negative payment", () => {
    expect(() =>
      computeSettlement({
        participantCount: 2,
        expenses: [{ sharesMinor: [50, 50], paymentsMinor: [-10, 110] }],
        mode: "direct",
      }),
    ).toThrow("computeGroupBalances");
  });

  it("rejects total payments not matching total shares", () => {
    expect(() =>
      computeSettlement({
        participantCount: 2,
        expenses: [{ sharesMinor: [50, 50], paymentsMinor: [100, 10] }],
        mode: "direct",
      }),
    ).toThrow("computeGroupBalances");
  });
});

function buildEvenShares(totalMinor: number, participantCount: number): number[] {
  const baseShareMinor = Math.floor(totalMinor / participantCount);
  const remainderMinor = totalMinor - baseShareMinor * participantCount;
  return Array.from({ length: participantCount }, (_, index) => baseShareMinor + (index < remainderMinor ? 1 : 0));
}

function applyTransfers(netMinor: readonly number[], transfers: readonly Transfer[]): number[] {
  const net = new Map<number, number>();
  netMinor.forEach((value, index) => net.set(index, value));
  for (const transfer of transfers) {
    net.set(transfer.fromIndex, (net.get(transfer.fromIndex) ?? 0) + transfer.amountMinor);
    net.set(transfer.toIndex, (net.get(transfer.toIndex) ?? 0) - transfer.amountMinor);
  }
  return netMinor.map((_, index) => net.get(index) ?? 0);
}

// PRNG kecil dengan seed tetap biar kegagalan property test bisa direproduksi
// tanpa nebak — mulberry32, bukan dependency baru. Pola sama dengan
// allocate-by-weights.test.ts dan compute-balances.test.ts.
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

function randomBalancedExpense(random: () => number, participantCount: number): ExpenseLedger {
  while (true) {
    const sharesMinor = Array.from({ length: participantCount }, () => randomShareMinor(random));
    const totalSharesMinor = sharesMinor.reduce((sum, value) => sum + value, 0);
    if (totalSharesMinor < 0) continue;
    const paymentsMinor = randomPaymentsMinor(random, participantCount, totalSharesMinor);
    return { sharesMinor, paymentsMinor };
  }
}

function requireIndexedValue(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`internal test error, missing value at index ${index}`);
  }
  return value;
}

function computeNetSentReceived(participantCount: number, transfers: readonly Transfer[]): number[] {
  const net = new Map<number, number>();
  for (let index = 0; index < participantCount; index++) net.set(index, 0);
  for (const transfer of transfers) {
    net.set(transfer.fromIndex, (net.get(transfer.fromIndex) ?? 0) + transfer.amountMinor);
    net.set(transfer.toIndex, (net.get(transfer.toIndex) ?? 0) - transfer.amountMinor);
  }
  return Array.from({ length: participantCount }, (_, index) => net.get(index) ?? 0);
}

describe("computeSettlement — property", () => {
  const SEED = 777;
  const ITERATIONS = 3000;

  it(`keeps settlement transfers exact across ${ITERATIONS} random cases (seed ${SEED})`, () => {
    const random = mulberry32(SEED);

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const participantCount = randomInt(random, 2, 12);
      const expenseCount = randomInt(random, 1, 15);
      const expenses = Array.from({ length: expenseCount }, () => randomBalancedExpense(random, participantCount));
      const groupBalance = computeGroupBalances({ participantCount, expenses });
      const context = `seed=${SEED} iteration=${iteration} participantCount=${participantCount} expenses=${JSON.stringify(expenses)}`;

      for (const mode of ["direct", "simplified"] as const) {
        const result = computeSettlement({ participantCount, expenses, mode });
        const modeContext = `${context} mode=${mode}`;

        const finalNet = applyTransfers(groupBalance.netMinor, result.transfers);
        expect(finalNet.every((net) => net === 0), modeContext).toBe(true);

        for (const transfer of result.transfers) {
          expect(transfer.amountMinor > 0, modeContext).toBe(true);
          expect(transfer.fromIndex !== transfer.toIndex, modeContext).toBe(true);
        }

        if (mode === "simplified") {
          expect(result.transfers.length <= participantCount - 1, modeContext).toBe(true);
        }

        const netSentReceived = computeNetSentReceived(participantCount, result.transfers);
        groupBalance.netMinor.forEach((net, index) => {
          // "+ 0" normalizes -0 to 0 so Object.is-based equality (used by
          // toBe) doesn't fail on a participant with a zero net.
          expect(requireIndexedValue(netSentReceived, index) + 0, modeContext).toBe(-net + 0);
        });
      }
    }
  });
});
