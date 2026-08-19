import { describe, expect, it } from "vitest";
import { calculateExpense } from "./calculate-expense";
import { calculateGroupBalances } from "./calculate-group-balances";
import type { ExpenseCalculation } from "./expense.types";
import type { GroupCalculation } from "./calculate-group-balances";

// spec.md 24 bullets NOT represented as rows below, because they aren't a
// calculation concern — split-engine has no state, no clock, no network:
// - Member dihapus saat ada transaksi berjalan: storage/UI state (F2/F3).
// - Dua orang mengedit pengeluaran bersamaan: sync/conflict resolution (K-11, TERBUKA).
// - Perangkat dengan jam salah: server timestamp ordering, not a money computation.
// - Struk mata uang beda dari grup: currency conversion happens before a caller
//   ever builds the minor-unit inputs this package works with (F1-08 catatan lepas).
// - Kuota scan habis: OCR/scan flow state, not calculation.
// - Link klaim dibuka setelah difinalisasi: routing/UI state (fase 2).
// - Pengeluaran dengan lebih dari 100 item: splitByItems has no upper bound on
//   item count, the "grouped by category" behavior spec.md 24 describes is a
//   claim-screen display concern, not a calculation rule.
// - Storage device penuh: device storage/PWA concern, not calculation.
const LARGE_GROUP_PARTICIPANT_COUNT = 51;

interface RejectedCase {
  readonly name: string;
  readonly specRef: string;
  readonly run: () => unknown;
  readonly errorMessage: string;
}

const REJECTED_CASES: readonly RejectedCase[] = [
  {
    name: "total nol ditolak",
    specRef: "spec.md 24: total nol atau negatif ditolak",
    run: () =>
      calculateExpense({
        totalMinor: 0,
        split: { mode: "evenly", participantCount: 2 },
        paymentsMinor: [0, 0],
      }),
    errorMessage: "totalMinor must be a positive integer",
  },
  {
    name: "total negatif ditolak",
    specRef: "spec.md 24: total nol atau negatif ditolak",
    run: () =>
      calculateExpense({
        totalMinor: -100,
        split: { mode: "evenly", participantCount: 2 },
        paymentsMinor: [-50, -50],
      }),
    errorMessage: "totalMinor must be a positive integer",
  },
  {
    name: "pengeluaran tanpa peserta ditolak",
    specRef: "spec.md 24: pengeluaran tanpa peserta ditolak",
    run: () =>
      calculateExpense({
        totalMinor: 100,
        split: { mode: "evenly", participantCount: 0 },
        paymentsMinor: [],
      }),
    errorMessage: "splitEvenly",
  },
  {
    name: "semua bobot nol ditolak",
    specRef: "spec.md 24: semua peserta bobot nol ditolak",
    run: () =>
      calculateExpense({
        totalMinor: 100,
        split: { mode: "byWeights", weights: [0, 0] },
        paymentsMinor: [100, 0],
      }),
    errorMessage: "allocateByWeights",
  },
];

interface AcceptedExpenseCase {
  readonly name: string;
  readonly specRef: string;
  readonly run: () => ExpenseCalculation;
  readonly assert: (result: ExpenseCalculation) => void;
}

const ACCEPTED_EXPENSE_CASES: readonly AcceptedExpenseCase[] = [
  {
    name: "diskon lewat charges sebagai nominal negatif diterima",
    specRef: "spec.md 24: total nol atau negatif ditolak, kecuali untuk entri diskon",
    run: () =>
      calculateExpense({
        totalMinor: 100,
        split: { mode: "evenly", participantCount: 2 },
        charges: [{ amount: { kind: "fixed", amountMinor: -20 }, allocation: { mode: "proportional" } }],
        paymentsMinor: [80, 0],
      }),
    assert: (result) => {
      expect(result.sharesMinor).toEqual([40, 40]);
      const sumNetMinor = result.netMinor.reduce((sum, net) => sum + net, 0);
      expect(sumNetMinor).toBe(0);
    },
  },
];

interface AcceptedGroupCase {
  readonly name: string;
  readonly specRef: string;
  readonly run: () => GroupCalculation;
  readonly assert: (result: GroupCalculation) => void;
}

function buildLargeGroupExpense(): { sharesMinor: number[]; paymentsMinor: number[] } {
  const totalMinor = 10 * LARGE_GROUP_PARTICIPANT_COUNT;
  const sharesMinor = Array.from({ length: LARGE_GROUP_PARTICIPANT_COUNT }, () => 10);
  const paymentsMinor = Array.from({ length: LARGE_GROUP_PARTICIPANT_COUNT }, (_, index) =>
    index === 0 ? totalMinor : 0,
  );
  return { sharesMinor, paymentsMinor };
}

const ACCEPTED_GROUP_CASES: readonly AcceptedGroupCase[] = [
  {
    name: "grup lebih dari 50 member dengan mode simplified menghasilkan warning large_group_simplify",
    specRef: "spec.md 24: grup lebih dari 50 member didukung, dengan peringatan Simplify",
    run: () =>
      calculateGroupBalances({
        participantCount: LARGE_GROUP_PARTICIPANT_COUNT,
        expenses: [buildLargeGroupExpense()],
        settlementMode: "simplified",
      }),
    assert: (result) => {
      expect(result.warnings).toEqual([
        { code: "large_group_simplify", participantCount: LARGE_GROUP_PARTICIPANT_COUNT },
      ]);
      expect(result.transfers.length).toBeGreaterThan(0);
      const sumMinor = result.transfers.reduce((sum, transfer) => sum + transfer.amountMinor, 0);
      expect(sumMinor).toBeGreaterThan(0);
    },
  },
  {
    name: "grup lebih dari 50 member dengan mode direct tidak menghasilkan warning large_group_simplify",
    specRef: "spec.md 24: peringatan cuma berlaku untuk mode Simplify",
    run: () =>
      calculateGroupBalances({
        participantCount: LARGE_GROUP_PARTICIPANT_COUNT,
        expenses: [buildLargeGroupExpense()],
        settlementMode: "direct",
      }),
    assert: (result) => {
      expect(result.warnings).toEqual([]);
    },
  },
];

describe("spec.md 24 — kasus tepi yang relevan ke perhitungan", () => {
  it.each(REJECTED_CASES.map((testCase) => [testCase.name, testCase] as const))(
    "%s",
    (_name, testCase) => {
      expect(testCase.run, testCase.specRef).toThrow(testCase.errorMessage);
    },
  );

  it.each(ACCEPTED_EXPENSE_CASES.map((testCase) => [testCase.name, testCase] as const))(
    "%s",
    (_name, testCase) => {
      testCase.assert(testCase.run());
    },
  );

  it.each(ACCEPTED_GROUP_CASES.map((testCase) => [testCase.name, testCase] as const))(
    "%s",
    (_name, testCase) => {
      testCase.assert(testCase.run());
    },
  );
});

describe("spec.md 24 — integrasi empat lapisan", () => {
  it("nyambung split byItems, dua mode biaya, satu traktir, dan dua pembayar", () => {
    const result = calculateExpense({
      totalMinor: 130,
      split: {
        mode: "byItems",
        participantCount: 3,
        items: [
          {
            unitPriceMinor: 50,
            quantity: 2,
            claims: [
              { participantIndex: 0, weight: 1 },
              { participantIndex: 1, weight: 1 },
            ],
          },
          { unitPriceMinor: 30, quantity: 1, claims: [{ participantIndex: 2, weight: 1 }] },
        ],
      },
      charges: [
        { amount: { kind: "fixed", amountMinor: 13 }, allocation: { mode: "proportional" } },
        { amount: { kind: "fixed", amountMinor: -20 }, allocation: { mode: "items", itemIndices: [1] } },
      ],
      treats: [{ kind: "person", sponsorIndex: 1, beneficiaryIndex: 2 }],
      paymentsMinor: [100, 23, 0],
    });

    expect(result.sharesMinor).toEqual([55, 68, 0]);
    const sumSharesMinor = result.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
    // Total after fees: subtotal (130) plus the two charges (13 - 20 = -7).
    expect(sumSharesMinor).toBe(123);

    const sumNetMinor = result.netMinor.reduce((sum, net) => sum + net, 0);
    expect(sumNetMinor).toBe(0);

    expect(result.perItem?.length).toBe(2);
    expect(result.perCharge.length).toBe(2);
    expect(result.treatTransfers).toEqual([{ sponsorIndex: 1, beneficiaryIndex: 2, amountMinor: 13 }]);
  });
});
