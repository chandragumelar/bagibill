import { describe, expect, it } from "vitest";
import { splitByAdjustment } from "./split-by-adjustment";

describe("splitByAdjustment", () => {
  it("gives the adjusted participant the recomputed even share plus their own adjustment (spec.md 6.5)", () => {
    const result = splitByAdjustment({ totalMinor: 200000, adjustmentsMinor: [0, 8000, 0] });
    expect(result.sharesMinor).toEqual([64000, 72000, 64000]);
    expect(result.warnings).toEqual([]);
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(200000);
  });

  it("matches a plain even split when every adjustment is zero", () => {
    const result = splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [0, 0, 0] });
    expect(result.sharesMinor).toEqual([34, 33, 33]);
    expect(result.warnings).toEqual([]);
  });

  it("applies a small negative adjustment without going negative", () => {
    const result = splitByAdjustment({ totalMinor: 300, adjustmentsMinor: [-50, 0, 50] });
    expect(result.sharesMinor).toEqual([50, 100, 150]);
    expect(result.warnings).toEqual([]);
  });

  it("leaves an extreme personal discount negative instead of clamping it to zero", () => {
    const result = splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [-1000, 0, 0] });
    expect(result.sharesMinor).toEqual([-633, 367, 366]);
    expect(result.warnings).toEqual([{ code: "negative_share", indices: [0] }]);
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(100);
  });

  it("reports every negative index in ascending order when two participants go negative", () => {
    const result = splitByAdjustment({ totalMinor: 10, adjustmentsMinor: [-100, -100, 0] });
    expect(result.sharesMinor).toEqual([-30, -30, 70]);
    expect(result.warnings).toEqual([{ code: "negative_share", indices: [0, 1] }]);
  });

  it("gives the entire total to a single participant", () => {
    const result = splitByAdjustment({ totalMinor: 55, adjustmentsMinor: [0] });
    expect(result.sharesMinor).toEqual([55]);
  });

  it("splits a zero total into all zeros", () => {
    const result = splitByAdjustment({ totalMinor: 0, adjustmentsMinor: [0, 0] });
    expect(result.sharesMinor).toEqual([0, 0]);
  });

  it("splits a negative total while keeping the sum exact", () => {
    const result = splitByAdjustment({ totalMinor: -100, adjustmentsMinor: [0, 0] });
    expect(result.sharesMinor).toEqual([-50, -50]);
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(-100);
  });

  it("produces only integer shares", () => {
    const result = splitByAdjustment({ totalMinor: 200000, adjustmentsMinor: [0, 8000, 0] });
    for (const shareMinor of result.sharesMinor) {
      expect(Number.isInteger(shareMinor)).toBe(true);
    }
  });

  it("returns a result the same length as the adjustments input", () => {
    const result = splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [0, 0, 0] });
    expect(result.sharesMinor.length).toBe(3);
  });

  it("rejects an empty adjustments array", () => {
    expect(() => splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [] })).toThrow("splitByAdjustment");
  });

  it("rejects a fractional adjustment", () => {
    expect(() => splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [50.5, 49.5] })).toThrow(
      "splitByAdjustment",
    );
  });

  it("rejects a fractional totalMinor", () => {
    expect(() => splitByAdjustment({ totalMinor: 100.5, adjustmentsMinor: [0, 0] })).toThrow("splitByAdjustment");
  });

  it("rejects a NaN adjustment", () => {
    expect(() => splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [NaN, 0] })).toThrow("splitByAdjustment");
  });

  it("rejects an Infinity adjustment", () => {
    expect(() => splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [Infinity, 0] })).toThrow(
      "splitByAdjustment",
    );
  });
});
