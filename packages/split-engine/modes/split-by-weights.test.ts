import { describe, expect, it } from "vitest";
import { splitByWeights } from "./split-by-weights";

describe("splitByWeights", () => {
  it("splits an equal-weight total that does not divide evenly into thirds that sum exactly", () => {
    const result = splitByWeights({ totalMinor: 100, weights: [1, 1, 1] });
    expect(result.sharesMinor).toEqual([34, 33, 33]);
    expect(result.warnings).toEqual([]);
  });

  it("gives the double-weight participant exactly half", () => {
    const result = splitByWeights({ totalMinor: 400, weights: [2, 1, 1] });
    expect(result.sharesMinor).toEqual([200, 100, 100]);
  });

  it("splits fractional weights", () => {
    const result = splitByWeights({ totalMinor: 200, weights: [0.5, 0.5, 1] });
    expect(result.sharesMinor).toEqual([50, 50, 100]);
  });

  it("keeps a zero-weight participant in the array with a zero share", () => {
    const result = splitByWeights({ totalMinor: 100, weights: [1, 1, 0] });
    expect(result.sharesMinor).toEqual([50, 50, 0]);
  });

  it("gives the entire total to a single participant", () => {
    const result = splitByWeights({ totalMinor: 77, weights: [1] });
    expect(result.sharesMinor).toEqual([77]);
  });

  it("splits a zero total into all zeros", () => {
    const result = splitByWeights({ totalMinor: 0, weights: [1, 1] });
    expect(result.sharesMinor).toEqual([0, 0]);
  });

  it("splits a negative total while keeping the sum exact", () => {
    const result = splitByWeights({ totalMinor: -100, weights: [1, 1] });
    expect(result.sharesMinor).toEqual([-50, -50]);
  });

  it("never produces warnings", () => {
    const cases = [
      splitByWeights({ totalMinor: 100, weights: [1, 1, 1] }),
      splitByWeights({ totalMinor: 0, weights: [1, 1] }),
      splitByWeights({ totalMinor: -100, weights: [1, 1] }),
    ];
    for (const result of cases) {
      expect(result.warnings).toEqual([]);
    }
  });

  it("keeps the sum of shares exactly equal to totalMinor", () => {
    const result = splitByWeights({ totalMinor: 100, weights: [2, 1, 1] });
    const sumMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    expect(sumMinor).toBe(100);
  });

  it("produces only integer shares", () => {
    const result = splitByWeights({ totalMinor: 200, weights: [0.5, 0.5, 1] });
    for (const shareMinor of result.sharesMinor) {
      expect(Number.isInteger(shareMinor)).toBe(true);
    }
  });

  it("returns a result the same length as the weights input", () => {
    const result = splitByWeights({ totalMinor: 100, weights: [2, 1, 1] });
    expect(result.sharesMinor.length).toBe(3);
  });

  it("rejects an empty weights array", () => {
    expect(() => splitByWeights({ totalMinor: 100, weights: [] })).toThrow("splitByWeights");
  });

  it("rejects all weights being zero", () => {
    expect(() => splitByWeights({ totalMinor: 100, weights: [0, 0] })).toThrow();
  });

  it("rejects a negative weight", () => {
    expect(() => splitByWeights({ totalMinor: 100, weights: [-1, 2] })).toThrow();
  });

  it("rejects a fractional totalMinor", () => {
    expect(() => splitByWeights({ totalMinor: 100.5, weights: [1, 1] })).toThrow();
  });
});
