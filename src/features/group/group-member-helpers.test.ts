import { describe, expect, it } from "vitest";
import type { ExpenseRecord, SettlementRecord } from "@/lib/storage/records";
import { findSimilarDraftNames, initialsFromTwoWords, memberTransactionCount } from "./group-member-helpers";

describe("initialsFromTwoWords", () => {
  it("takes the first two words, not first+last", () => {
    expect(initialsFromTwoWords("Farhan Maulana Abdurrahman")).toBe("FM");
  });

  it("handles a single word", () => {
    expect(initialsFromTwoWords("Dimas")).toBe("D");
  });

  it("handles two words", () => {
    expect(initialsFromTwoWords("Dimas Prasetyo")).toBe("DP");
  });

  it("collapses extra whitespace", () => {
    expect(initialsFromTwoWords("  Dimas   Prasetyo  ")).toBe("DP");
  });
});

function expense(overrides: Partial<ExpenseRecord>): ExpenseRecord {
  return {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Test",
    category: "other",
    date: 0,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 1000,
    payers: [],
    splitData: { mode: "evenly", memberIds: [] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "m1",
    createdAt: 0,
    updatedAt: 0,
    seq: 0,
    ...overrides,
  };
}

function settlement(overrides: Partial<SettlementRecord>): SettlementRecord {
  return {
    settlementId: "s1",
    groupSlug: "g1",
    fromMemberId: "m1",
    toMemberId: "m2",
    amountMinor: 1000,
    currency: "IDR",
    date: 0,
    createdAt: 0,
    seq: 0,
    ...overrides,
  };
}

describe("memberTransactionCount", () => {
  it("counts an expense where the member is a payer", () => {
    const e = expense({ payers: [{ memberId: "m1", amountMinor: 1000 }] });
    expect(memberTransactionCount("m1", [e], [])).toBe(1);
  });

  it("counts an expense where the member is a split participant but not a payer", () => {
    const e = expense({ splitData: { mode: "evenly", memberIds: ["m1", "m2"] } });
    expect(memberTransactionCount("m1", [e], [])).toBe(1);
  });

  it("does not count an expense the member isn't part of", () => {
    const e = expense({ splitData: { mode: "evenly", memberIds: ["m2"] } });
    expect(memberTransactionCount("m1", [e], [])).toBe(0);
  });

  it("counts settlements from either direction", () => {
    const s1 = settlement({ fromMemberId: "m1", toMemberId: "m2" });
    const s2 = settlement({ fromMemberId: "m2", toMemberId: "m1" });
    expect(memberTransactionCount("m1", [], [s1, s2])).toBe(2);
  });
});

describe("findSimilarDraftNames", () => {
  it("flags a one-edit-distance typo", () => {
    expect(findSimilarDraftNames("Dimass", ["Dimas", "Sarah"])).toEqual(["Dimas"]);
  });

  it("is normalization-insensitive (trim/case/spacing)", () => {
    expect(findSimilarDraftNames("DIMAS ", ["dimas"])).toEqual(["dimas"]);
  });

  it("finds nothing for a genuinely different name", () => {
    expect(findSimilarDraftNames("Dimas", ["Dinar"])).toEqual([]);
  });
});
