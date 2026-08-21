import { describe, expect, it } from "vitest";
import { calculateExpense } from "@bagibill/split-engine";
import type { ExpenseRecord } from "@/lib/storage/records";
import { buildExpenseSummary, summarizeExpenseRecord } from "./expense-summary";
import type { ExpenseMemberInfo } from "./expense-summary";

const MEMBER_INFO: ReadonlyMap<string, ExpenseMemberInfo> = new Map([
  ["m1", { memberId: "m1", name: "Andi", color: "--m-1" }],
  ["m2", { memberId: "m2", name: "Rina", color: "--m-2" }],
]);

function makeExpenseRecord(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Makan malam",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [{ memberId: "m1", amountMinor: 10_000 }],
    splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "m1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

describe("buildExpenseSummary", () => {
  it("shapes the split, members, and total correctly from a calculateExpense result", () => {
    const calculation = calculateExpense({
      totalMinor: 10_000,
      split: { mode: "evenly", participantCount: 2 },
      paymentsMinor: [10_000, 0],
    });

    const summary = buildExpenseSummary({
      memberOrder: ["m1", "m2"],
      memberInfo: MEMBER_INFO,
      chargeMeta: [],
      calculation,
    });

    expect(summary.totalMinor).toBe(10_000);
    expect(summary.members).toEqual([
      { memberId: "m1", name: "Andi", color: "--m-1", shareMinor: 5_000, netMinor: 5_000 },
      { memberId: "m2", name: "Rina", color: "--m-2", shareMinor: 5_000, netMinor: -5_000 },
    ]);
    expect(summary.charges).toEqual([]);
    expect(summary.treats).toEqual([]);
    expect(summary.warnings).toEqual([]);
  });

  // The syarat selesai plan.md test: an unsaved draft and a saved
  // ExpenseRecord for equivalent data must produce identical summaries —
  // proof the transaction row and the result panel render from the same
  // structure, not two structures that happen to look alike.
  it("produces the identical shape for equivalent draft data and a saved ExpenseRecord", () => {
    const draftCalculation = calculateExpense({
      totalMinor: 10_000,
      split: { mode: "byWeights", weights: [2, 1] },
      paymentsMinor: [10_000, 0],
    });
    const draftSummary = buildExpenseSummary({
      memberOrder: ["m1", "m2"],
      memberInfo: MEMBER_INFO,
      chargeMeta: [],
      calculation: draftCalculation,
    });

    const record = makeExpenseRecord({
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "byWeights", entries: [{ memberId: "m1", weight: 2 }, { memberId: "m2", weight: 1 }] },
    });
    const savedSummary = summarizeExpenseRecord(record, MEMBER_INFO);

    expect(savedSummary).toEqual(draftSummary);
  });

  it("keeps a member treated to zero in the member list, at zero, never dropped", () => {
    const calculation = calculateExpense({
      totalMinor: 10_000,
      split: { mode: "evenly", participantCount: 2 },
      paymentsMinor: [10_000, 0],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });

    const summary = buildExpenseSummary({
      memberOrder: ["m1", "m2"],
      memberInfo: MEMBER_INFO,
      chargeMeta: [],
      calculation,
    });

    expect(summary.members).toHaveLength(2);
    const rina = summary.members.find((member) => member.memberId === "m2");
    expect(rina?.shareMinor).toBe(0);
  });

  it("names the sponsor and the amount in a treat sentence", () => {
    const calculation = calculateExpense({
      totalMinor: 10_000,
      split: { mode: "evenly", participantCount: 2 },
      paymentsMinor: [10_000, 0],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });

    const summary = buildExpenseSummary({
      memberOrder: ["m1", "m2"],
      memberInfo: MEMBER_INFO,
      chargeMeta: [],
      calculation,
    });

    expect(summary.treats).toEqual([
      { sponsorMemberId: "m1", sponsorName: "Andi", beneficiaryMemberId: "m2", beneficiaryName: "Rina", amountMinor: 5_000 },
    ]);
  });

  it("passes engine warnings through unchanged", () => {
    const calculation = calculateExpense({
      totalMinor: 10_000,
      split: { mode: "byAmounts", amountsMinor: [3_000, 3_000] },
      paymentsMinor: [6_000, 0],
    });

    const summary = buildExpenseSummary({
      memberOrder: ["m1", "m2"],
      memberInfo: MEMBER_INFO,
      chargeMeta: [],
      calculation,
    });

    expect(summary.warnings).toEqual([{ code: "under_allocated", remainingMinor: 4_000 }]);
  });

  it("passes a negative share through as negative, never clamped to zero", () => {
    const calculation = calculateExpense({
      totalMinor: 10_000,
      split: { mode: "byAdjustment", adjustmentsMinor: [-20_000, 20_000] },
      paymentsMinor: [10_000, 0],
    });

    const summary = buildExpenseSummary({
      memberOrder: ["m1", "m2"],
      memberInfo: MEMBER_INFO,
      chargeMeta: [],
      calculation,
    });

    const andi = summary.members.find((member) => member.memberId === "m1");
    expect(andi?.shareMinor).toBe(-15_000);
  });
});

describe("summarizeExpenseRecord", () => {
  it("computes the summary from a stored record via toCalculationInput/calculateExpense", () => {
    const record = makeExpenseRecord();
    const summary = summarizeExpenseRecord(record, MEMBER_INFO);
    expect(summary.members).toEqual([
      { memberId: "m1", name: "Andi", color: "--m-1", shareMinor: 5_000, netMinor: 5_000 },
      { memberId: "m2", name: "Rina", color: "--m-2", shareMinor: 5_000, netMinor: -5_000 },
    ]);
  });

  it("omits the charge name for a stored charge — ChargeRecord carries no name field (K-91)", () => {
    const record = makeExpenseRecord({
      amountTotalMinor: 11_000,
      payers: [{ memberId: "m1", amountMinor: 12_000 }],
      charges: [{ amount: { kind: "fixed", amountMinor: 1_000 }, allocation: { mode: "proportional" } }],
    });
    const summary = summarizeExpenseRecord(record, MEMBER_INFO);
    expect(summary.charges).toHaveLength(1);
    expect(summary.charges[0]?.name).toBeUndefined();
  });

  it("throws when a saved record fails the calculation gate, instead of silently producing wrong numbers", () => {
    const record = makeExpenseRecord({
      payers: [{ memberId: "m1", amountMinor: 4_000 }],
    });
    expect(() => summarizeExpenseRecord(record, MEMBER_INFO)).toThrow();
  });
});
