import { describe, expect, it } from "vitest";
import { allocateByWeights } from "./allocate-by-weights";

describe("allocateByWeights — normal", () => {
  it("100 dibagi 3 bobot sama", () => {
    expect(allocateByWeights({ totalMinor: 100, weights: [1, 1, 1] })).toEqual([34, 33, 33]);
  });

  it("10 dibagi 3 bobot sama", () => {
    expect(allocateByWeights({ totalMinor: 10, weights: [1, 1, 1] })).toEqual([4, 3, 3]);
  });

  it("1 sen dibagi 3 bobot sama", () => {
    expect(allocateByWeights({ totalMinor: 1, weights: [1, 1, 1] })).toEqual([1, 0, 0]);
  });

  it("total ganjil dengan 7 orang bobot sama", () => {
    expect(allocateByWeights({ totalMinor: 101, weights: [1, 1, 1, 1, 1, 1, 1] })).toEqual([
      15, 15, 15, 14, 14, 14, 14,
    ]);
  });

  it("bobot [2, 1, 1], yang bobot 2 dapat setengah", () => {
    expect(allocateByWeights({ totalMinor: 40, weights: [2, 1, 1] })).toEqual([20, 10, 10]);
  });

  it("bobot pecahan [0.5, 0.5, 1]", () => {
    expect(allocateByWeights({ totalMinor: 41, weights: [0.5, 0.5, 1] })).toEqual([10, 10, 21]);
  });

  it("bobot pecahan [0.1, 0.2, 0.7] — normalisasi satu desimal", () => {
    expect(allocateByWeights({ totalMinor: 10, weights: [0.1, 0.2, 0.7] })).toEqual([1, 2, 7]);
  });

  it("bobot pecahan [1.5, 2.25] — normalisasi dua desimal sekaligus", () => {
    expect(allocateByWeights({ totalMinor: 375, weights: [1.5, 2.25] })).toEqual([150, 225]);
  });

  it("bobot besar yang lewat Number.MAX_SAFE_INTEGER kalau dihitung pakai number — buktiin BigInt kepakai", () => {
    // 7 * Number.MAX_SAFE_INTEGER = 63050394783186937, di luar jangkauan
    // aman double (2^53), jadi hasil ini cuma benar kalau perkaliannya BigInt.
    expect(allocateByWeights({ totalMinor: 7, weights: [Number.MAX_SAFE_INTEGER, 1] })).toEqual([7, 0]);
  });

  it("kasus persentase 33,33 tiga kali (total bobot 99,99)", () => {
    expect(allocateByWeights({ totalMinor: 100, weights: [33.33, 33.33, 33.33] })).toEqual([34, 33, 33]);
  });

  it("tie-break: indeks kecil menang dan hasilnya deterministik", () => {
    const input = { totalMinor: 1, weights: [1, 1] };
    expect(allocateByWeights(input)).toEqual([1, 0]);
    expect(allocateByWeights(input)).toEqual([1, 0]);
  });
});

describe("allocateByWeights — batas", () => {
  it("weights kosong dan totalMinor nol: array kosong", () => {
    expect(allocateByWeights({ totalMinor: 0, weights: [] })).toEqual([]);
  });

  it("sebagian bobot nol: orang itu dapat 0 dan tetap muncul", () => {
    expect(allocateByWeights({ totalMinor: 10, weights: [1, 0, 1] })).toEqual([5, 0, 5]);
  });

  it("totalMinor nol dengan bobot valid: semua dapat nol", () => {
    expect(allocateByWeights({ totalMinor: 0, weights: [1, 2, 3] })).toEqual([0, 0, 0]);
  });

  it("satu peserta, total positif: dapat semuanya", () => {
    expect(allocateByWeights({ totalMinor: 77, weights: [1] })).toEqual([77]);
  });

  it("satu peserta, total negatif: dapat semuanya, tetap minus", () => {
    expect(allocateByWeights({ totalMinor: -77, weights: [5] })).toEqual([-77]);
  });
});

describe("allocateByWeights — ditolak", () => {
  it("bobot negatif", () => {
    expect(() => allocateByWeights({ totalMinor: 10, weights: [1, -1] })).toThrow(/is negative/);
  });

  it("semua bobot nol", () => {
    expect(() => allocateByWeights({ totalMinor: 10, weights: [0, 0, 0] })).toThrow(/all weights are zero/);
  });

  it("weights kosong dengan total bukan nol", () => {
    expect(() => allocateByWeights({ totalMinor: 5, weights: [] })).toThrow(/zero participants/);
  });

  it("totalMinor pecahan", () => {
    expect(() => allocateByWeights({ totalMinor: 10.5, weights: [1, 1] })).toThrow(/must be an integer/);
  });

  it("bobot NaN", () => {
    expect(() => allocateByWeights({ totalMinor: 10, weights: [1, Number.NaN] })).toThrow(/not a finite number/);
  });

  it("bobot Infinity", () => {
    expect(() => allocateByWeights({ totalMinor: 10, weights: [1, Number.POSITIVE_INFINITY] })).toThrow(
      /not a finite number/,
    );
  });
});

// PRNG kecil dengan seed tetap biar kegagalan property test bisa direproduksi
// tanpa nebak — mulberry32, bukan dependency baru.
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

// Hundredths (weight * 100) as the source of truth for both the input weight
// and the invariant checks below, so the test never has to re-parse a float
// back into a fraction to verify itself.
function randomWeightHundredths(random: () => number): number {
  if (random() < 0.15) return 0;
  const decimalStyle = randomInt(random, 0, 2);
  const magnitude = randomInt(random, 1, 200);
  if (decimalStyle === 0) return magnitude * 100;
  if (decimalStyle === 1) return magnitude * 10;
  return magnitude;
}

function generateWeightHundredths(random: () => number, count: number): number[] {
  while (true) {
    const values = Array.from({ length: count }, () => randomWeightHundredths(random));
    if (values.some((value) => value > 0)) return values;
  }
}

function assertWithinOneMinorUnitOfIdeal(
  hundredths: readonly number[],
  totalMinor: number,
  result: readonly number[],
  context: string,
): void {
  const sumScaled = hundredths.reduce((sum, value) => sum + BigInt(value), 0n);
  const totalAbs = BigInt(Math.abs(totalMinor));
  hundredths.forEach((value, index) => {
    const amount = result[index];
    if (amount === undefined) throw new Error(`${context}: missing result at index ${index}`);
    const idealNumerator = totalAbs * BigInt(value);
    const actualNumerator = BigInt(Math.abs(amount)) * sumScaled;
    const diff = actualNumerator > idealNumerator ? actualNumerator - idealNumerator : idealNumerator - actualNumerator;
    expect(diff < sumScaled, `${context} index=${index}`).toBe(true);
  });
}

function assertEqualWeightsStayClose(hundredths: readonly number[], result: readonly number[], context: string): void {
  const amountsByWeight = new Map<number, number[]>();
  hundredths.forEach((value, index) => {
    const amount = result[index];
    if (amount === undefined) throw new Error(`${context}: missing result at index ${index}`);
    const bucket = amountsByWeight.get(value) ?? [];
    bucket.push(amount);
    amountsByWeight.set(value, bucket);
  });
  for (const amounts of amountsByWeight.values()) {
    if (amounts.length < 2) continue;
    const spread = Math.max(...amounts) - Math.min(...amounts);
    expect(spread <= 1, context).toBe(true);
  }
}

describe("allocateByWeights — property", () => {
  const SEED = 1337;
  const ITERATIONS = 5000;

  it(`holds invariants across ${ITERATIONS} random cases (seed ${SEED})`, () => {
    const random = mulberry32(SEED);

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const participantCount = randomInt(random, 1, 20);
      const hundredths = generateWeightHundredths(random, participantCount);
      const weights = hundredths.map((value) => value / 100);
      const totalMinor = randomInt(random, -1_000_000_000_000, 1_000_000_000_000);
      const context = `seed=${SEED} iteration=${iteration} totalMinor=${totalMinor} weights=[${weights.join(",")}]`;

      const result = allocateByWeights({ totalMinor, weights });
      const repeat = allocateByWeights({ totalMinor, weights });

      expect(result.length, context).toBe(weights.length);
      expect(
        result.reduce((sum, amount) => sum + amount, 0),
        context,
      ).toBe(totalMinor);
      for (const amount of result) {
        expect(Number.isInteger(amount), context).toBe(true);
      }
      hundredths.forEach((value, index) => {
        if (value !== 0) return;
        expect(result[index], context).toBe(0);
      });
      if (totalMinor > 0 && hundredths.every((value) => value > 0)) {
        for (const amount of result) {
          expect(amount >= 0, context).toBe(true);
        }
      }

      assertWithinOneMinorUnitOfIdeal(hundredths, totalMinor, result, context);
      assertEqualWeightsStayClose(hundredths, result, context);
      expect(repeat, context).toEqual(result);
    }
  });
});
