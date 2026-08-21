import { describe, expect, it } from "vitest";
import { calculateExpense } from "@bagibill/split-engine";
import { render, screen } from "@testing-library/react";
import { t, formatMoney } from "@/lib/i18n";
import { ResultPanel } from "./ResultPanel";
import type { ChargeDraft, ExpenseDraftMember } from "./expense-draft";
import type { ExpenseDraftResult } from "./use-expense-draft";

const MEMBERS: readonly ExpenseDraftMember[] = [
  { memberId: "m1", name: "Andi", color: "--m-1", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
  { memberId: "m2", name: "Rina", color: "--m-2", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
];

// RTL's default text matcher normalizes DOM whitespace (including Intl's
// non-breaking space between currency and amount) before comparing — same
// helper AddExpenseScreen.test.tsx uses, needed here for the same reason.
function money(amountMinor: number): string {
  return formatMoney(amountMinor, "IDR").replace(/\u00a0/g, " ");
}

function readyResult(calculation: Parameters<typeof calculateExpense>[0]): ExpenseDraftResult {
  return { ready: true, calculation: calculateExpense(calculation), memberOrder: ["m1", "m2"] };
}

function charge(overrides: Partial<ChargeDraft> = {}): ChargeDraft {
  return {
    id: "c1",
    name: "Pajak",
    amountKind: "percent",
    rawValue: "10",
    percentBasis: "subtotal",
    allocationMode: "proportional",
    allocationMemberId: "",
    ...overrides,
  };
}

describe("ResultPanel", () => {
  it("renders nothing when there are no charges or treats", () => {
    const result = readyResult({ totalMinor: 10_000, split: { mode: "evenly", participantCount: 2 }, paymentsMinor: [10_000, 0] });
    const { container } = render(<ResultPanel members={MEMBERS} charges={[]} treatCount={0} currency="IDR" result={result} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps a fully treated member in the list at zero — never dropped from the breakdown", () => {
    const result = readyResult({
      totalMinor: 10_000,
      split: { mode: "evenly", participantCount: 2 },
      paymentsMinor: [10_000, 0],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });
    render(<ResultPanel members={MEMBERS} charges={[]} treatCount={1} currency="IDR" result={result} />);
    expect(screen.getByText("Rina")).toBeInTheDocument();
    expect(screen.getAllByText(money(0)).length).toBeGreaterThan(0);
  });

  it("shows an explicit sentence naming the sponsor and the amount for a person treat", () => {
    const result = readyResult({
      totalMinor: 10_000,
      split: { mode: "evenly", participantCount: 2 },
      paymentsMinor: [10_000, 0],
      treats: [{ kind: "person", sponsorIndex: 0, beneficiaryIndex: 1 }],
    });
    render(<ResultPanel members={MEMBERS} charges={[]} treatCount={1} currency="IDR" result={result} />);
    expect(
      screen.getByText(
        t("expense.treat.transferSentence", { sponsor: "Andi", beneficiary: "Rina", amount: money(5_000) }),
      ),
    ).toBeInTheDocument();
  });

  it("shows a negative share as a minus amount with a short explanation, never clamped to zero", () => {
    // "even" allocation, not "proportional" — a proportional charge on top
    // of a negative base share is rejected by the engine (F1-06 catatan
    // lepas), so this exercises the display path without hitting that guard.
    const result = readyResult({
      totalMinor: 10_000,
      split: { mode: "byAdjustment", adjustmentsMinor: [-20_000, 20_000] },
      paymentsMinor: [10_000, 0],
    });
    render(
      <ResultPanel members={MEMBERS} charges={[charge({ allocationMode: "even" })]} treatCount={0} currency="IDR" result={result} />,
    );
    expect(screen.getByText(t("expense.result.negativeBadge"))).toBeInTheDocument();
    expect(screen.getAllByText(money(-15_000)).length).toBeGreaterThan(0);
  });

  it("shows warnings from the engine instead of discarding them", () => {
    // Payments sum to what the under-allocated split actually produces
    // (6,000), not the nominal total — computeExpenseBalance rejects a
    // payments/shares mismatch as an error (K-43), so under_allocated's
    // "remaining unallocated" warning has to be reached this way instead.
    const result = readyResult({
      totalMinor: 10_000,
      split: { mode: "byAmounts", amountsMinor: [3_000, 3_000] },
      paymentsMinor: [6_000, 0],
    });
    render(
      <ResultPanel members={MEMBERS} charges={[charge({ allocationMode: "even" })]} treatCount={0} currency="IDR" result={result} />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
