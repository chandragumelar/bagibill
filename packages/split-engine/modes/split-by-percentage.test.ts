import { describe, expect, it } from "vitest";
import { splitByPercentage } from "./split-by-percentage";

describe("splitByPercentage", () => {
  it("splits 50/50", () => {
    const result = splitByPercentage({ totalMinor: 100, percentages: [50, 50] });
    expect(result.sharesMinor).toEqual([50, 50]);
    expect(result.warnings).toEqual([]);
  });

  it("does not throw and sums exactly for 33.33 repeated three times (99.99 total)", () => {
    const result = splitByPercentage({ totalMinor: 100000, percentages: [33.33, 33.33, 33.33] });
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(100000);
  });

  it("accepts a sum of 100.01, within the 1 basis point tolerance", () => {
    const result = splitByPercentage({ totalMinor: 100, percentages: [50.01, 50] });
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(100);
  });

  it("splits 60/40", () => {
    const result = splitByPercentage({ totalMinor: 100, percentages: [60, 40] });
    expect(result.sharesMinor).toEqual([60, 40]);
  });

  it("keeps a participant with a zero percentage in the array", () => {
    const result = splitByPercentage({ totalMinor: 100, percentages: [0, 100] });
    expect(result.sharesMinor).toEqual([0, 100]);
  });

  it("gives the entire total to a single participant at 100 percent", () => {
    const result = splitByPercentage({ totalMinor: 50, percentages: [100] });
    expect(result.sharesMinor).toEqual([50]);
  });

  it("splits a zero total into all zeros", () => {
    const result = splitByPercentage({ totalMinor: 0, percentages: [50, 50] });
    expect(result.sharesMinor).toEqual([0, 0]);
  });

  it("splits a negative total while keeping the sum exact", () => {
    const result = splitByPercentage({ totalMinor: -100, percentages: [50, 50] });
    expect(result.sharesMinor).toEqual([-50, -50]);
  });

  it("never produces warnings", () => {
    const result = splitByPercentage({ totalMinor: 100, percentages: [33.33, 33.33, 33.33] });
    expect(result.warnings).toEqual([]);
  });

  it("keeps the sum of shares exactly equal to totalMinor", () => {
    const result = splitByPercentage({ totalMinor: 100, percentages: [60, 40] });
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(100);
  });

  it("produces only integer shares", () => {
    const result = splitByPercentage({ totalMinor: 100000, percentages: [33.33, 33.33, 33.33] });
    for (const shareMinor of result.sharesMinor) {
      expect(Number.isInteger(shareMinor)).toBe(true);
    }
  });

  it("rejects a sum of 99.98, outside the 1 basis point tolerance", () => {
    expect(() => splitByPercentage({ totalMinor: 100, percentages: [99.98] })).toThrow("splitByPercentage");
  });

  it("rejects a sum of 105", () => {
    expect(() => splitByPercentage({ totalMinor: 100, percentages: [105] })).toThrow("splitByPercentage");
  });

  it("rejects a negative percentage", () => {
    expect(() => splitByPercentage({ totalMinor: 100, percentages: [-10, 110] })).toThrow("splitByPercentage");
  });

  it("rejects all-zero percentages", () => {
    expect(() => splitByPercentage({ totalMinor: 100, percentages: [0, 0] })).toThrow("splitByPercentage");
  });

  it("rejects a percentage with three decimal places", () => {
    expect(() => splitByPercentage({ totalMinor: 100, percentages: [33.333, 33.333, 33.334] })).toThrow(
      "splitByPercentage",
    );
  });

  it("rejects an empty percentages array", () => {
    expect(() => splitByPercentage({ totalMinor: 100, percentages: [] })).toThrow("splitByPercentage");
  });

  it("rejects a fractional totalMinor", () => {
    expect(() => splitByPercentage({ totalMinor: 100.5, percentages: [50, 50] })).toThrow("splitByPercentage");
  });
});
