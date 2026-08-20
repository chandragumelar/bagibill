import { describe, expect, it } from "vitest";
import {
  createInitialDraft,
  toCalculationInput,
  toCreateExpenseInput,
  type ChargeDraft,
  type DraftInit,
  type ExpenseDraft,
  type TreatDraft,
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

function chargeDraft(overrides: Partial<ChargeDraft> = {}): ChargeDraft {
  return {
    id: "c1",
    name: "Service",
    amountKind: "percent",
    rawValue: "10",
    percentBasis: "subtotal",
    allocationMode: "proportional",
    allocationMemberId: "",
    ...overrides,
  };
}

function treatDraft(overrides: Partial<TreatDraft> = {}): TreatDraft {
  return {
    id: "t1",
    kind: "person",
    sponsorMemberId: "m1",
    beneficiaryMemberId: "m2",
    partialAmountMinor: 0,
    ...overrides,
  };
}

describe("toCalculationInput — charges", () => {
  it("translates a percent charge with its basis, and a negative fixed charge as a discount", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      charges: [
        chargeDraft({ id: "c1", amountKind: "percent", rawValue: "10", percentBasis: "subtotal" }),
        chargeDraft({ id: "c2", amountKind: "fixed", rawValue: "-2000" }),
      ],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.charges).toEqual([
      { amount: { kind: "percent", percent: 10, basis: "subtotal" }, allocation: { mode: "proportional" } },
      { amount: { kind: "fixed", amountMinor: -2_000 }, allocation: { mode: "proportional" } },
    ]);
  });

  it("preserves charge order — running_total basis depends on what came before it in the array", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      charges: [
        chargeDraft({ id: "service", rawValue: "5", percentBasis: "subtotal" }),
        chargeDraft({ id: "pb1", rawValue: "10", percentBasis: "running_total" }),
      ],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.charges?.map((charge) => charge.amount)).toEqual([
      { kind: "percent", percent: 5, basis: "subtotal" },
      { kind: "percent", percent: 10, basis: "running_total" },
    ]);
  });

  it("resolves single_payer to the sponsor's participant index", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      charges: [chargeDraft({ allocationMode: "single_payer", allocationMemberId: "m2" })],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.charges).toEqual([
      { amount: { kind: "percent", percent: 10, basis: "subtotal" }, allocation: { mode: "single_payer", participantIndex: 1 } },
    ]);
  });

  it("falls back single_payer to even when the target member is no longer checked", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 1 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: false, weight: 1 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 1 },
      ],
      charges: [chargeDraft({ allocationMode: "single_payer", allocationMemberId: "m2" })],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.charges).toEqual([
      { amount: { kind: "percent", percent: 10, basis: "subtotal" }, allocation: { mode: "even" } },
    ]);
  });

  it("omits charges entirely from the engine input when the draft has none", () => {
    const draft = draftWith({ amountMinor: 9_000 });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.charges).toBeUndefined();
  });
});

describe("toCalculationInput — treats", () => {
  it("translates a person treat with sponsor/beneficiary participant indices", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      treats: [treatDraft({ kind: "person", sponsorMemberId: "m1", beneficiaryMemberId: "m3" })],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.treats).toEqual([{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 2 }]);
  });

  it("translates a partial treat with its amount", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      treats: [treatDraft({ kind: "partial", sponsorMemberId: "m1", beneficiaryMemberId: "m2", partialAmountMinor: 1_500 })],
    });
    const result = toCalculationInput(draft);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.input.treats).toEqual([{ kind: "partial", sponsorIndex: 0, beneficiaryIndex: 1, amountMinor: 1_500 }]);
  });

  it("is not calculable when a treat's sponsor and beneficiary are the same person", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      treats: [treatDraft({ sponsorMemberId: "m1", beneficiaryMemberId: "m1" })],
    });
    expect(toCalculationInput(draft)).toEqual({ ready: false, reason: "treatSponsorEqualsBeneficiary" });
  });

  it("is not calculable when a treat points at a member who isn't checked", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      members: [
        { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 1 },
        { memberId: "m2", name: "Sarah", color: "--m-2", checked: false, weight: 1 },
        { memberId: "m3", name: "Andi", color: "--m-3", checked: true, weight: 1 },
      ],
      treats: [treatDraft({ sponsorMemberId: "m1", beneficiaryMemberId: "m2" })],
    });
    expect(toCalculationInput(draft)).toEqual({ ready: false, reason: "treatMemberUnchecked" });
  });

  it("is not calculable when a partial treat has no amount yet", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      treats: [treatDraft({ kind: "partial", partialAmountMinor: 0 })],
    });
    expect(toCalculationInput(draft)).toEqual({ ready: false, reason: "treatPartialAmountMissing" });
  });
});

describe("toCreateExpenseInput — charges and treats", () => {
  const save = { groupSlug: "g1", createdBy: "m1", date: 2_000 };

  it("shapes charges with memberId (not a participant index) for single_payer", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      charges: [
        chargeDraft({ amountKind: "fixed", rawValue: "-1000", allocationMode: "single_payer", allocationMemberId: "m2" }),
      ],
    });
    const input = toCreateExpenseInput(draft, save);
    expect(input?.charges).toEqual([
      { amount: { kind: "fixed", amountMinor: -1_000 }, allocation: { mode: "single_payer", memberId: "m2" } },
    ]);
  });

  it("shapes treats with sponsorMemberId/beneficiaryMemberId, not indices", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      treats: [
        treatDraft({ kind: "partial", sponsorMemberId: "m1", beneficiaryMemberId: "m3", partialAmountMinor: 2_000 }),
      ],
    });
    const input = toCreateExpenseInput(draft, save);
    expect(input?.treats).toEqual([
      { kind: "partial", sponsorMemberId: "m1", beneficiaryMemberId: "m3", amountMinor: 2_000 },
    ]);
  });

  it("returns null when a treat is invalid, same as an incomplete split", () => {
    const draft = draftWith({
      amountMinor: 9_000,
      treats: [treatDraft({ sponsorMemberId: "m1", beneficiaryMemberId: "m1" })],
    });
    expect(toCreateExpenseInput(draft, save)).toBeNull();
  });
});
