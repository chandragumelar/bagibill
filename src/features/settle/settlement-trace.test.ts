import { describe, expect, it } from "vitest";
import { computeGroupBalances, computeSettlement } from "@bagibill/split-engine";
import type { ExpenseLedger, Transfer } from "@bagibill/split-engine";
import { MAX_TRACE_PATH_LENGTH, traceMemberBalance, traceTransfer, type LedgerOrigin } from "./settlement-trace";

const EXPENSE_A: LedgerOrigin = { kind: "expense", expenseId: "e1", title: "Makan malam", date: 1_000 };
const EXPENSE_B: LedgerOrigin = { kind: "expense", expenseId: "e2", title: "Nginap villa", date: 2_000 };
const SETTLEMENT_A: LedgerOrigin = {
  kind: "settlement",
  settlementId: "s1",
  date: 3_000,
  fromMemberId: "m3",
  toMemberId: "m1",
};

// Three participants, two expenses, one settlement (m3 pays m1 back 10) —
// each ledger sums to zero on its own, same shape use-group-balance.ts
// builds from a real expense/settlement mix.
const LEDGERS: readonly ExpenseLedger[] = [
  { sharesMinor: [50, 30, 20], paymentsMinor: [100, 0, 0] },
  { sharesMinor: [0, 50, 50], paymentsMinor: [0, 100, 0] },
  { sharesMinor: [10, 0, 0], paymentsMinor: [0, 0, 10] },
];
const ORIGINS: readonly LedgerOrigin[] = [EXPENSE_A, EXPENSE_B, SETTLEMENT_A];

describe("traceMemberBalance", () => {
  it("sums to exactly the engine's netMinor for every participant", () => {
    const { netMinor } = computeGroupBalances({ participantCount: 3, expenses: LEDGERS });

    for (let participantIndex = 0; participantIndex < 3; participantIndex++) {
      const contributions = traceMemberBalance(participantIndex, LEDGERS, ORIGINS);
      const sum = contributions.reduce((total, contribution) => total + contribution.amountMinor, 0);
      expect(sum, `participant ${participantIndex}`).toBe(netMinor[participantIndex]);
    }
  });

  it("drops a ledger this member contributed zero to", () => {
    const contributions = traceMemberBalance(0, LEDGERS, ORIGINS);
    expect(contributions.map((c) => c.origin)).toEqual([EXPENSE_A, SETTLEMENT_A]);
  });

  it("labels a settlement contribution with kind settlement, never disguised as an expense", () => {
    const contributions = traceMemberBalance(0, LEDGERS, ORIGINS);
    const settlementContribution = contributions.find((c) => c.origin.kind === "settlement");
    expect(settlementContribution).toBeDefined();
    expect(settlementContribution?.amountMinor).toBe(-10);
  });

  it("returns an empty list, not an error, for a member with zero net in every ledger", () => {
    const settledLedgers: readonly ExpenseLedger[] = [{ sharesMinor: [50, 50], paymentsMinor: [50, 50] }];
    const contributions = traceMemberBalance(0, settledLedgers, [EXPENSE_A]);
    expect(contributions).toEqual([]);
  });
});

function directTransfer(from: number, to: number, amountMinor: number): Transfer {
  return { fromIndex: from, toIndex: to, amountMinor };
}

describe("traceTransfer — direct", () => {
  it("recognizes a transfer that matches its own pairwise edge as direct, zero intermediaries", () => {
    const pairwise = [directTransfer(0, 1, 100)];
    const explanation = traceTransfer(directTransfer(0, 1, 100), pairwise);

    expect(explanation.kind).toBe("direct");
    expect(explanation.chains).toEqual([{ segments: [{ fromIndex: 0, toIndex: 1, amountMinor: 100 }], amountMinor: 100 }]);
    expect(explanation.unexplainedMinor).toBe(0);
  });
});

describe("traceTransfer — chained", () => {
  it("explains a two-hop chain: A owes B, B owes C, so A pays C directly", () => {
    const pairwise = [directTransfer(0, 1, 50), directTransfer(1, 2, 50)];
    const explanation = traceTransfer(directTransfer(0, 2, 50), pairwise);

    expect(explanation.kind).toBe("chained");
    expect(explanation.chains).toEqual([
      {
        segments: [
          { fromIndex: 0, toIndex: 1, amountMinor: 50 },
          { fromIndex: 1, toIndex: 2, amountMinor: 50 },
        ],
        amountMinor: 50,
      },
    ]);
    expect(explanation.unexplainedMinor).toBe(0);
  });

  it("explains a three-hop chain", () => {
    const pairwise = [directTransfer(0, 1, 40), directTransfer(1, 2, 40), directTransfer(2, 3, 40)];
    const explanation = traceTransfer(directTransfer(0, 3, 40), pairwise);

    expect(explanation.kind).toBe("chained");
    expect(explanation.chains).toHaveLength(1);
    expect(explanation.chains[0]?.segments).toHaveLength(3);
    expect(explanation.unexplainedMinor).toBe(0);
  });

  it("splits one transfer across two different chains when a single path's capacity isn't enough", () => {
    const pairwise = [directTransfer(0, 1, 30), directTransfer(1, 2, 50), directTransfer(0, 3, 20), directTransfer(3, 2, 20)];
    const explanation = traceTransfer(directTransfer(0, 2, 50), pairwise);

    expect(explanation.kind).toBe("chained");
    expect(explanation.chains).toEqual([
      {
        segments: [
          { fromIndex: 0, toIndex: 1, amountMinor: 30 },
          { fromIndex: 1, toIndex: 2, amountMinor: 30 },
        ],
        amountMinor: 30,
      },
      {
        segments: [
          { fromIndex: 0, toIndex: 3, amountMinor: 20 },
          { fromIndex: 3, toIndex: 2, amountMinor: 20 },
        ],
        amountMinor: 20,
      },
    ]);
    expect(explanation.unexplainedMinor).toBe(0);
  });
});

describe("traceTransfer — partial and unexplained", () => {
  it("reports a transfer with zero path honestly, inventing no chain", () => {
    const pairwise = [directTransfer(1, 2, 50)];
    const explanation = traceTransfer(directTransfer(0, 2, 30), pairwise);

    expect(explanation.kind).toBe("partial");
    expect(explanation.chains).toEqual([]);
    expect(explanation.explainedMinor).toBe(0);
    expect(explanation.unexplainedMinor).toBe(30);
  });

  it("splits a partially-explainable transfer into an explained chain and an honest remainder", () => {
    const pairwise = [directTransfer(0, 1, 20), directTransfer(1, 2, 20)];
    const explanation = traceTransfer(directTransfer(0, 2, 50), pairwise);

    expect(explanation.kind).toBe("partial");
    expect(explanation.chains).toEqual([
      {
        segments: [
          { fromIndex: 0, toIndex: 1, amountMinor: 20 },
          { fromIndex: 1, toIndex: 2, amountMinor: 20 },
        ],
        amountMinor: 20,
      },
    ]);
    expect(explanation.explainedMinor).toBe(20);
    expect(explanation.unexplainedMinor).toBe(30);
  });

  it("treats a chain that would exceed the path-length limit as unexplained rather than searching forever", () => {
    // A straight-line graph one hop longer than MAX_TRACE_PATH_LENGTH allows.
    const pairwise = Array.from({ length: MAX_TRACE_PATH_LENGTH + 1 }, (_, index) => directTransfer(index, index + 1, 10));
    const explanation = traceTransfer(directTransfer(0, MAX_TRACE_PATH_LENGTH + 1, 10), pairwise);

    expect(explanation.kind).toBe("partial");
    expect(explanation.chains).toEqual([]);
    expect(explanation.unexplainedMinor).toBe(10);
  });

  it("never lets the sum of chain amounts exceed the transfer's own amount", () => {
    const pairwise = [directTransfer(0, 1, 20), directTransfer(1, 2, 20)];
    const explanation = traceTransfer(directTransfer(0, 2, 50), pairwise);
    const chainTotal = explanation.chains.reduce((sum, chain) => sum + chain.amountMinor, 0);

    expect(chainTotal).toBeLessThanOrEqual(50);
    expect(chainTotal + explanation.unexplainedMinor).toBe(50);
  });
});

describe("traceTransfer — determinism", () => {
  it("returns an identical explanation when called twice with the same input", () => {
    const pairwise = [directTransfer(0, 1, 30), directTransfer(1, 2, 50), directTransfer(0, 3, 20), directTransfer(3, 2, 20)];
    const transfer = directTransfer(0, 2, 50);

    const first = traceTransfer(transfer, pairwise);
    const second = traceTransfer(transfer, pairwise);

    expect(second).toEqual(first);
  });
});

// Reused from compute-settlement.test.ts's "5 participants, 20 transactions"
// fixture (same formula, not randomized) — the case that made F3-07's
// done-criteria for tracing a non-obvious simplified transfer.
function buildEvenShares(totalMinor: number, participantCount: number): number[] {
  const baseShareMinor = Math.floor(totalMinor / participantCount);
  const remainderMinor = totalMinor - baseShareMinor * participantCount;
  return Array.from({ length: participantCount }, (_, index) => baseShareMinor + (index < remainderMinor ? 1 : 0));
}

function buildFiveParticipantTwentyExpenseLedgers(): ExpenseLedger[] {
  const participantCount = 5;
  return Array.from({ length: 20 }, (_, expenseIndex) => {
    const payerIndex = expenseIndex % participantCount;
    const totalMinor = 300 + 13 * expenseIndex;
    const sharesMinor = buildEvenShares(totalMinor, participantCount);
    const paymentsMinor = Array.from({ length: participantCount }, (_, index) => (index === payerIndex ? totalMinor : 0));
    return { sharesMinor, paymentsMinor };
  });
}

describe("traceTransfer — five participants, twenty transactions", () => {
  it("traces every Ringkas transfer with a consistent explained-plus-unexplained total", () => {
    const expenses = buildFiveParticipantTwentyExpenseLedgers();
    const participantCount = 5;
    const simplified = computeSettlement({ participantCount, expenses, mode: "simplified" });
    const direct = computeSettlement({ participantCount, expenses, mode: "direct" });

    expect(simplified.transfers.length).toBeGreaterThan(0);

    for (const transfer of simplified.transfers) {
      const explanation = traceTransfer(transfer, direct.pairwiseTransfers);
      expect(explanation.explainedMinor + explanation.unexplainedMinor).toBe(transfer.amountMinor);
      const chainTotal = explanation.chains.reduce((sum, chain) => sum + chain.amountMinor, 0);
      expect(chainTotal).toBe(explanation.explainedMinor);
    }
  });
});
