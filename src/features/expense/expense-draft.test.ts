import { describe, expect, it } from "vitest";
import {
  createInitialDraft,
  toCalculationInput,
  toCreateExpenseInput,
  type DraftInit,
  type ExpenseDraft,
} from "./expense-draft";

// MoneyInput (F0-05) already turns typed digits into a clean amountMinor
// number before this draft ever sees it — there's no raw money text left to
// run through parseMoney for the Rata screen, so these tests exercise the
// integer amountMinor path instead. See progress.md for the report on this.

const INIT: DraftInit = {
  members: [
    { memberId: "m1", name: "Farhan", color: "--m-1" },
    { memberId: "m2", name: "Sarah", color: "--m-2" },
    { memberId: "m3", name: "Andi", color: "--m-3" },
  ],
  currency: "IDR",
  category: "food",
  date: 1_000,
};

function draftWith(overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
  return { ...createInitialDraft(INIT), ...overrides };
}

describe("createInitialDraft", () => {
  it("checks every member and defaults the payer to the first member", () => {
    const draft = createInitialDraft(INIT);
    expect(draft.members.every((member) => member.checked)).toBe(true);
    expect(draft.payerMemberId).toBe("m1");
    expect(draft.amountMinor).toBe(0);
    expect(draft.category).toBe("food");
    expect(draft.currency).toBe("IDR");
  });
});

describe("toCalculationInput", () => {
  it("is not calculable when the amount is empty", () => {
    const result = toCalculationInput(draftWith({ amountMinor: 0 }));
    expect(result).toEqual({ ready: false, reason: "emptyAmount" });
  });

  it("is not calculable when no member is checked", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      members: INIT.members.map((member) => ({ ...member, checked: false, weight: 1 })),
    });
    const result = toCalculationInput(draft);
    expect(result).toEqual({ ready: false, reason: "noParticipants" });
  });

  it("is not calculable when the payer is unchecked", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: false, weight: 1 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: true, weight: 1 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 1 },
      ],
      payerMemberId: "m1",
    });
    const result = toCalculationInput(draft);
    expect(result).toEqual({ ready: false, reason: "payerExcluded" });
  });

  it("builds an evenly-split calculateExpense input, one payment slot per checked member", () => {
    const draft = draftWith({ amountMinor: 9_000 });
    const result = toCalculationInput(draft);
    expect(result).toEqual({
      ready: true,
      memberOrder: ["m1", "m2", "m3"],
      input: {
        totalMinor: 9_000,
        split: { mode: "evenly", participantCount: 3 },
        paymentsMinor: [9_000, 0, 0],
      },
    });
  });

  it("keeps display order for memberOrder when a middle member is unchecked", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 1 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: false, weight: 1 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 1 },
      ],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.memberOrder).toEqual(["m1", "m3"]);
      expect(result.input.paymentsMinor).toEqual([9_000, 0]);
    }
  });
});

describe("toCalculationInput — byWeights mode", () => {
  function weightedDraft(weights: readonly [number, number, number], overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
    return draftWith({
      mode: "byWeights",
      amountMinor: 9_000,
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: weights[0] },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: true, weight: weights[1] },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: weights[2] },
      ],
      ...overrides,
    });
  }

  it("builds a byWeights calculateExpense input carrying each checked member's weight, fractional values passed through as-is", () => {
    const result = toCalculationInput(weightedDraft([2, 1, 0.33]));
    expect(result).toEqual({
      ready: true,
      memberOrder: ["m1", "m2", "m3"],
      input: {
        totalMinor: 9_000,
        split: { mode: "byWeights", weights: [2, 1, 0.33] },
        paymentsMinor: [9_000, 0, 0],
      },
    });
  });

  it("drops an unchecked member from memberOrder and weights entirely — they never appear in the result", () => {
    const draft = weightedDraft([1, 1, 1], {
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 1 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: false, weight: 1 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 1 },
      ],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.memberOrder).toEqual(["m1", "m3"]);
      expect(result.input.split).toEqual({ mode: "byWeights", weights: [1, 1] });
    }
  });

  it("keeps a checked member at weight zero in memberOrder — they're recorded, not removed", () => {
    const result = toCalculationInput(weightedDraft([1, 0, 1]));
    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.memberOrder).toEqual(["m1", "m2", "m3"]);
      expect(result.input.split).toEqual({ mode: "byWeights", weights: [1, 0, 1] });
    }
  });

  it("is not calculable when every checked member is at weight zero", () => {
    const result = toCalculationInput(weightedDraft([0, 0, 0]));
    expect(result).toEqual({ ready: false, reason: "allWeightsZero" });
  });
});

describe("toCreateExpenseInput", () => {
  const save = { groupSlug: "g1", createdBy: "m1", date: 2_000 };

  it("returns null when the draft cannot be calculated", () => {
    expect(toCreateExpenseInput(draftWith({ amountMinor: 0 }), save)).toBeNull();
    const noParticipants = draftWith({
      amountMinor: 9_000,
      members: INIT.members.map((member) => ({ ...member, checked: false, weight: 1 })),
    });
    expect(toCreateExpenseInput(noParticipants, save)).toBeNull();
  });

  it("shapes an evenly SplitDataRecord with memberIds in display order and a single full-amount payer", () => {
    const draft = draftWith({ amountMinor: 9_000, title: "Makan malam" });
    const input = toCreateExpenseInput(draft, save);
    expect(input).toEqual({
      groupSlug: "g1",
      title: "Makan malam",
      category: "food",
      date: 2_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 9_000,
      payers: [{ memberId: "m1", amountMinor: 9_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2", "m3"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m1",
    });
  });

  it("shapes a byWeights SplitDataRecord with one {memberId, weight} entry per checked member — the exact shape createExpense's calculation gate expects", () => {
    const draft = draftWith({
      mode: "byWeights",
      amountMinor: 9_000,
      title: "Nasi goreng",
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 2 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: false, weight: 1 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 1 },
      ],
    });
    const input = toCreateExpenseInput(draft, save);
    expect(input?.splitData).toEqual({
      mode: "byWeights",
      entries: [
        { memberId: "m1", weight: 2 },
        { memberId: "m3", weight: 1 },
      ],
    });
  });

  it("returns null when every checked member is at weight zero", () => {
    const draft = draftWith({
      mode: "byWeights",
      amountMinor: 9_000,
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 0 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: true, weight: 0 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 0 },
      ],
    });
    expect(toCreateExpenseInput(draft, save)).toBeNull();
  });
});
