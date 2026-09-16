import { describe, expect, it } from "vitest";
import { splitByAdjustment } from "./split-by-adjustment";
import { splitEvenly } from "./split-evenly";

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

  it("matches splitEvenly (mode Rata) when every adjustment is zero, for the same total and headcount", () => {
    for (const { totalMinor, count } of [
      { totalMinor: 200000, count: 4 },
      { totalMinor: 101, count: 3 },
      { totalMinor: 1, count: 5 },
    ]) {
      const adjustmentResult = splitByAdjustment({ totalMinor, adjustmentsMinor: Array(count).fill(0) });
      const evenResult = splitEvenly({ totalMinor, participantCount: count });
      expect(adjustmentResult.sharesMinor).toEqual(evenResult.sharesMinor);
      expect(adjustmentResult.evenSharesMinor).toEqual(evenResult.sharesMinor);
    }
  });

  // spec.md 6.5 worked example: total 200.000, 4 orang, Siska (index 3) +8.000.
  it("spec.md 6.5: base 192,000 split 4 ways at 48,000 each, Siska's own +8,000 added back", () => {
    const result = splitByAdjustment({ totalMinor: 200000, adjustmentsMinor: [0, 0, 0, 8000] });
    expect(result.evenSharesMinor).toEqual([48000, 48000, 48000, 48000]);
    expect(result.sharesMinor).toEqual([48000, 48000, 48000, 56000]);
    expect(result.warnings).toEqual([]);
    expect(result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(200000);
  });

  it("spec.md 6.5: total 100.000, 4 orang, satu orang -15.000", () => {
    const result = splitByAdjustment({ totalMinor: 100000, adjustmentsMinor: [0, 0, 0, -15000] });
    expect(result.evenSharesMinor).toEqual([28750, 28750, 28750, 28750]);
    expect(result.sharesMinor).toEqual([28750, 28750, 28750, 13750]);
    expect(result.warnings).toEqual([]);
    expect(result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(100000);
  });

  it("cancels out a positive and a negative adjustment back to the plain even split", () => {
    const result = splitByAdjustment({ totalMinor: 400000, adjustmentsMinor: [10000, -10000, 0, 0] });
    expect(result.evenSharesMinor).toEqual([100000, 100000, 100000, 100000]);
    expect(result.sharesMinor).toEqual([110000, 90000, 100000, 100000]);
    expect(result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(400000);
  });

  it("spreads the base's own rounding remainder one unit at a time from the largest fraction, then layers adjustments on top", () => {
    // baseTotalMinor 101 over 3 people: 101/3 floors to 33 each with
    // remainder 2 — the first two participants (by index, tie-broken by
    // largest-remainder's stable sort) get the leftover unit.
    const result = splitByAdjustment({ totalMinor: 101, adjustmentsMinor: [10, -5, -5] });
    expect(result.evenSharesMinor).toEqual([34, 34, 33]);
    expect(result.sharesMinor).toEqual([44, 29, 28]);
    expect(result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(101);
  });

  it("keeps computing when adjustments sum past the total, warning adjustment_exceeds_total instead of throwing", () => {
    // sum of adjustments 130 > totalMinor 100 — baseTotalMinor goes to -30.
    const result = splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [100, 30] });
    expect(result.warnings).toEqual([{ code: "adjustment_exceeds_total", shortfallMinor: 30 }]);
    expect(result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(100);
  });

  it("does not raise adjustment_exceeds_total when the base stays at exactly zero", () => {
    const result = splitByAdjustment({ totalMinor: 100, adjustmentsMinor: [60, 40] });
    expect(result.warnings).toEqual([]);
  });
});

describe("splitByAdjustment — property", () => {
  const SEED = 20260916;
  const ITERATIONS = 3000;

  // PRNG kecil dengan seed tetap biar kegagalan property test bisa
  // direproduksi tanpa nebak — mulberry32, bukan dependency baru (sama pola
  // dengan allocate-by-weights.test.ts).
  function mulberry32(seed: number): () => number {
    let state = seed;
    return function random() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(random: () => number, min: number, max: number): number {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  it(`holds sum-equals-total across ${ITERATIONS} random cases (seed ${SEED})`, () => {
    const random = mulberry32(SEED);

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const participantCount = randomInt(random, 1, 20);
      const totalMinor = randomInt(random, 0, 100_000_000);
      const adjustmentsMinor = Array.from({ length: participantCount }, () => randomInt(random, -50_000, 50_000));
      const context = `seed=${SEED} iteration=${iteration} totalMinor=${totalMinor} adjustmentsMinor=[${adjustmentsMinor.join(",")}]`;

      const result = splitByAdjustment({ totalMinor, adjustmentsMinor });

      expect(result.sharesMinor.length, context).toBe(participantCount);
      expect(result.evenSharesMinor.length, context).toBe(participantCount);
      for (const shareMinor of result.sharesMinor) {
        expect(Number.isInteger(shareMinor), context).toBe(true);
      }
      expect(
        result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0),
        context,
      ).toBe(totalMinor);

      const sumAdjustmentsMinor = adjustmentsMinor.reduce((sum, adjustmentMinor) => sum + adjustmentMinor, 0);
      const baseTotalMinor = totalMinor - sumAdjustmentsMinor;
      const exceedsWarning = result.warnings.find((warning) => warning.code === "adjustment_exceeds_total");
      if (baseTotalMinor < 0) {
        expect(exceedsWarning, context).toEqual({ code: "adjustment_exceeds_total", shortfallMinor: -baseTotalMinor });
      } else {
        expect(exceedsWarning, context).toBeUndefined();
      }

      const negativeIndices = result.sharesMinor
        .map((shareMinor, index) => ({ shareMinor, index }))
        .filter(({ shareMinor }) => shareMinor < 0)
        .map(({ index }) => index);
      const negativeWarning = result.warnings.find((warning) => warning.code === "negative_share");
      if (negativeIndices.length === 0) {
        expect(negativeWarning, context).toBeUndefined();
      } else {
        expect(negativeWarning, context).toEqual({ code: "negative_share", indices: negativeIndices });
      }
    }
  });
});
