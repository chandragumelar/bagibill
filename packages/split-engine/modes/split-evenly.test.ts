import { describe, expect, it } from "vitest";
import { splitEvenly } from "./split-evenly";

describe("splitEvenly", () => {
  it("splits 100 into 3 as [34, 33, 33]", () => {
    const result = splitEvenly({ totalMinor: 100, participantCount: 3 });
    expect(result.sharesMinor).toEqual([34, 33, 33]);
    expect(result.warnings).toEqual([]);
  });

  it("splits 10 into 3 as [4, 3, 3]", () => {
    const result = splitEvenly({ totalMinor: 10, participantCount: 3 });
    expect(result.sharesMinor).toEqual([4, 3, 3]);
  });

  it("splits 1 minor unit into 3 as [1, 0, 0]", () => {
    const result = splitEvenly({ totalMinor: 1, participantCount: 3 });
    expect(result.sharesMinor).toEqual([1, 0, 0]);
  });

  it("splits an odd total across 7 participants", () => {
    const result = splitEvenly({ totalMinor: 100, participantCount: 7 });
    expect(result.sharesMinor).toEqual([15, 15, 14, 14, 14, 14, 14]);
  });

  it("gives the entire total to a single participant", () => {
    const result = splitEvenly({ totalMinor: 100, participantCount: 1 });
    expect(result.sharesMinor).toEqual([100]);
  });

  it("splits a zero total into all zeros", () => {
    const result = splitEvenly({ totalMinor: 0, participantCount: 3 });
    expect(result.sharesMinor).toEqual([0, 0, 0]);
  });

  it("splits a negative total while keeping the sum exact", () => {
    const result = splitEvenly({ totalMinor: -100, participantCount: 3 });
    expect(result.sharesMinor).toEqual([-34, -33, -33]);
  });

  it("never produces warnings", () => {
    const cases = [
      splitEvenly({ totalMinor: 100, participantCount: 3 }),
      splitEvenly({ totalMinor: 0, participantCount: 3 }),
      splitEvenly({ totalMinor: -100, participantCount: 3 }),
    ];
    for (const result of cases) {
      expect(result.warnings).toEqual([]);
    }
  });

  it("keeps the sum of shares exactly equal to totalMinor", () => {
    const result = splitEvenly({ totalMinor: 100, participantCount: 7 });
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(100);
  });

  it("produces only integer shares", () => {
    const result = splitEvenly({ totalMinor: 100, participantCount: 7 });
    for (const shareMinor of result.sharesMinor) {
      expect(Number.isInteger(shareMinor)).toBe(true);
    }
  });

  it("rejects a participant count of zero", () => {
    expect(() => splitEvenly({ totalMinor: 100, participantCount: 0 })).toThrow("splitEvenly");
  });

  it("rejects a negative participant count", () => {
    expect(() => splitEvenly({ totalMinor: 100, participantCount: -2 })).toThrow("splitEvenly");
  });

  it("rejects a fractional participant count", () => {
    expect(() => splitEvenly({ totalMinor: 100, participantCount: 2.5 })).toThrow("splitEvenly");
  });

  it("rejects a fractional totalMinor", () => {
    expect(() => splitEvenly({ totalMinor: 100.5, participantCount: 3 })).toThrow("splitEvenly");
  });

  it("rejects NaN participant count", () => {
    expect(() => splitEvenly({ totalMinor: 100, participantCount: NaN })).toThrow("splitEvenly");
  });

  it("rejects Infinity participant count", () => {
    expect(() => splitEvenly({ totalMinor: 100, participantCount: Infinity })).toThrow("splitEvenly");
  });
});
