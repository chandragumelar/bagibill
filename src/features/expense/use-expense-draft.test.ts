import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useExpenseDraft } from "./use-expense-draft";
import type { DraftInit } from "./expense-draft";

const INIT: DraftInit = {
  members: [
    { memberId: "m1", name: "Farhan", color: "--m-1" },
    { memberId: "m2", name: "Sarah", color: "--m-2" },
  ],
  currency: "IDR",
  category: "food",
  date: 1_000,
};

describe("useExpenseDraft", () => {
  it("starts with every member checked and a not-ready result (no amount yet)", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    expect(result.current.draft.members.every((member) => member.checked)).toBe(true);
    expect(result.current.result).toEqual({ ready: false, reason: "emptyAmount" });
  });

  it("recomputes the result once an amount is set, with no calculate call involved", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    act(() => {
      result.current.setAmountMinor(10_000);
    });
    expect(result.current.result.ready).toBe(true);
    if (result.current.result.ready) {
      expect(result.current.result.memberOrder).toEqual(["m1", "m2"]);
      expect(result.current.result.calculation.sharesMinor).toEqual([5_000, 5_000]);
    }
  });

  it("updates the result when a member is unchecked", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    act(() => {
      result.current.setAmountMinor(10_000);
    });
    act(() => {
      result.current.toggleMember("m2");
    });
    expect(result.current.result.ready).toBe(true);
    if (result.current.result.ready) {
      expect(result.current.result.memberOrder).toEqual(["m1"]);
      expect(result.current.result.calculation.sharesMinor).toEqual([10_000]);
    }
  });

  it("checkAllMembers re-includes everyone after an uncheck", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    act(() => {
      result.current.toggleMember("m2");
    });
    expect(result.current.draft.members.find((member) => member.memberId === "m2")?.checked).toBe(false);
    act(() => {
      result.current.checkAllMembers();
    });
    expect(result.current.draft.members.every((member) => member.checked)).toBe(true);
  });

  it("setMode switches the split mode without touching amount or membership", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    act(() => {
      result.current.setAmountMinor(9_000);
      result.current.toggleMember("m2");
    });
    act(() => {
      result.current.setMode("byWeights");
    });
    expect(result.current.draft.mode).toBe("byWeights");
    expect(result.current.draft.amountMinor).toBe(9_000);
    expect(result.current.draft.members.find((member) => member.memberId === "m2")?.checked).toBe(false);
  });

  it("setWeight updates one member's weight and recomputes a byWeights result", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    act(() => {
      result.current.setAmountMinor(9_000);
      result.current.setMode("byWeights");
    });
    act(() => {
      result.current.setWeight("m1", 2);
    });
    expect(result.current.draft.members.find((member) => member.memberId === "m1")?.weight).toBe(2);
    expect(result.current.result.ready).toBe(true);
    if (result.current.result.ready) {
      expect(result.current.result.calculation.sharesMinor).toEqual([6_000, 3_000]);
    }
  });

  it("reflects two draft changes made back to back within the same render, with no effect delay", () => {
    const { result } = renderHook(() => useExpenseDraft(INIT));
    act(() => {
      result.current.setAmountMinor(9_000);
      result.current.toggleMember("m2");
    });
    // Both changes land before the next read — if the result were written by
    // an effect instead of derived in render, this would still show the
    // pre-toggle two-member split for at least one more tick.
    expect(result.current.result.ready).toBe(true);
    if (result.current.result.ready) {
      expect(result.current.result.memberOrder).toEqual(["m1"]);
      expect(result.current.result.calculation.sharesMinor).toEqual([9_000]);
    }
  });
});
