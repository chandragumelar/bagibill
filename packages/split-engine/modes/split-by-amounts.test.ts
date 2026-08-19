import { describe, expect, it } from "vitest";
import { splitByAmounts } from "./split-by-amounts";

describe("splitByAmounts", () => {
  it("returns exact amounts with no warning when they sum to the total", () => {
    const result = splitByAmounts({ totalMinor: 100, amountsMinor: [40, 30, 30] });
    expect(result.sharesMinor).toEqual([40, 30, 30]);
    expect(result.warnings).toEqual([]);
  });

  it("warns under_allocated with the remaining amount when amounts fall short", () => {
    const result = splitByAmounts({ totalMinor: 100, amountsMinor: [40, 30] });
    expect(result.sharesMinor).toEqual([40, 30]);
    expect(result.warnings).toEqual([{ code: "under_allocated", remainingMinor: 30 }]);
  });

  it("returns shares plus over_allocated warning instead of throwing when amounts exceed the total", () => {
    const result = splitByAmounts({ totalMinor: 100, amountsMinor: [40, 40, 40] });
    expect(result.sharesMinor).toEqual([40, 40, 40]);
    expect(result.warnings).toEqual([{ code: "over_allocated", excessMinor: 20 }]);
  });

  it("keeps a participant with a zero amount in the array", () => {
    const result = splitByAmounts({ totalMinor: 100, amountsMinor: [0, 100] });
    expect(result.sharesMinor).toEqual([0, 100]);
    expect(result.warnings).toEqual([]);
  });

  it("returns the full amount for a single participant", () => {
    const result = splitByAmounts({ totalMinor: 50, amountsMinor: [50] });
    expect(result.sharesMinor).toEqual([50]);
    expect(result.warnings).toEqual([]);
  });

  it("allows a negative totalMinor and still computes the warning", () => {
    const result = splitByAmounts({ totalMinor: -100, amountsMinor: [100] });
    expect(result.sharesMinor).toEqual([100]);
    expect(result.warnings).toEqual([{ code: "over_allocated", excessMinor: 200 }]);
  });

  it("produces at most one warning", () => {
    const exact = splitByAmounts({ totalMinor: 100, amountsMinor: [100] });
    const under = splitByAmounts({ totalMinor: 100, amountsMinor: [40] });
    const over = splitByAmounts({ totalMinor: 100, amountsMinor: [140] });
    expect(exact.warnings.length).toBe(0);
    expect(under.warnings.length).toBe(1);
    expect(over.warnings.length).toBe(1);
  });

  it("produces only integer shares", () => {
    const result = splitByAmounts({ totalMinor: 100, amountsMinor: [0, 100] });
    for (const shareMinor of result.sharesMinor) {
      expect(Number.isInteger(shareMinor)).toBe(true);
    }
  });

  it("rejects an empty amounts array", () => {
    expect(() => splitByAmounts({ totalMinor: 100, amountsMinor: [] })).toThrow("splitByAmounts");
  });

  it("rejects a negative per-person amount", () => {
    expect(() => splitByAmounts({ totalMinor: 100, amountsMinor: [-10, 110] })).toThrow("splitByAmounts");
  });

  it("rejects a fractional per-person amount", () => {
    expect(() => splitByAmounts({ totalMinor: 100, amountsMinor: [50.5, 49.5] })).toThrow("splitByAmounts");
  });

  it("rejects a fractional totalMinor", () => {
    expect(() => splitByAmounts({ totalMinor: 100.5, amountsMinor: [100] })).toThrow("splitByAmounts");
  });
});
