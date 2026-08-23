import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExpenseLedger, Transfer } from "@bagibill/split-engine";
import { formatMoney, t } from "@/lib/i18n";
import type { LedgerOrigin } from "./settlement-trace";
import type { BalanceMemberRow } from "./use-group-balance";
import { TraceSheet, type TraceSheetTarget } from "./TraceSheet";

const ROWS: readonly BalanceMemberRow[] = [
  { memberId: "m1", name: "Nadia", color: "--m-1", netMinor: 40_000, isCurrentMember: true, isInactive: false },
  { memberId: "m2", name: "Farhan", color: "--m-2", netMinor: -30_000, isCurrentMember: false, isInactive: false },
  { memberId: "m3", name: "Dewi", color: "--m-3", netMinor: -10_000, isCurrentMember: false, isInactive: false },
];

const EXPENSE_ORIGIN: LedgerOrigin = { kind: "expense", expenseId: "e1", title: "Makan malam", date: 1_000 };
const SETTLEMENT_ORIGIN: LedgerOrigin = {
  kind: "settlement",
  settlementId: "s1",
  date: 2_000,
  fromMemberId: "m3",
  toMemberId: "m1",
};

// m1 (Nadia): +50000 from the expense, -10000 from the settlement -> net 40000.
const LEDGERS: readonly ExpenseLedger[] = [
  { sharesMinor: [0, 50_000, 0], paymentsMinor: [50_000, 0, 0] },
  { sharesMinor: [10_000, 0, 0], paymentsMinor: [0, 0, 10_000] },
];
const ORIGINS: readonly LedgerOrigin[] = [EXPENSE_ORIGIN, SETTLEMENT_ORIGIN];

function noop() {
  return vi.fn();
}

describe("TraceSheet — opened from a balance row (member trace)", () => {
  const target: TraceSheetTarget = { kind: "member", memberId: "m1" };

  it("shows the member's contributions, expense and settlement labeled as their own kind", () => {
    render(
      <TraceSheet open target={target} rows={ROWS} ledgers={LEDGERS} origins={ORIGINS} directTransfers={[]} currency="IDR" onClose={noop()} />,
    );

    expect(screen.getByText(t("settle.trace.title"))).toBeInTheDocument();
    expect(screen.getByText("Makan malam")).toBeInTheDocument();
    expect(screen.getByText(t("settle.trace.settlementRow", { from: "Dewi", to: "Nadia" }))).toBeInTheDocument();
  });

  it("shows an honest empty state for a member with nothing contributing to their number", () => {
    render(
      <TraceSheet
        open
        target={{ kind: "member", memberId: "m2" } satisfies TraceSheetTarget}
        rows={ROWS}
        ledgers={[]}
        origins={[]}
        directTransfers={[]}
        currency="IDR"
        onClose={noop()}
      />,
    );
    expect(screen.getByText(t("settle.trace.emptyBody"))).toBeInTheDocument();
  });

  it("renders every contribution row, none cut off, so the sheet has something to scroll through on a long list", () => {
    const manyLedgers: ExpenseLedger[] = Array.from({ length: 15 }, (_, index) => ({
      sharesMinor: [0, 1_000, 0],
      paymentsMinor: [1_000 + index, 0, 0],
    }));
    const manyOrigins: LedgerOrigin[] = manyLedgers.map((_, index) => ({
      kind: "expense",
      expenseId: `e${index}`,
      title: `Pengeluaran ${index}`,
      date: 1_000 + index,
    }));

    render(
      <TraceSheet
        open
        target={target}
        rows={ROWS}
        ledgers={manyLedgers}
        origins={manyOrigins}
        directTransfers={[]}
        currency="IDR"
        onClose={noop()}
      />,
    );

    for (let index = 0; index < 15; index++) {
      expect(screen.getByText(`Pengeluaran ${index}`)).toBeInTheDocument();
    }
  });
});

describe("TraceSheet — opened from a transfer row (transfer trace)", () => {
  it("explains a routed transfer as a chain of names, readable as a sentence, not a list of ids", () => {
    const transfer: Transfer = { fromIndex: 0, toIndex: 2, amountMinor: 50_000 };
    const pairwise: readonly Transfer[] = [
      { fromIndex: 0, toIndex: 1, amountMinor: 50_000 },
      { fromIndex: 1, toIndex: 2, amountMinor: 50_000 },
    ];
    render(
      <TraceSheet
        open
        target={{ kind: "transfer", transfer } satisfies TraceSheetTarget}
        rows={ROWS}
        ledgers={[]}
        origins={[]}
        directTransfers={pairwise}
        currency="IDR"
        onClose={noop()}
      />,
    );

    expect(screen.getByText(t("settle.trace.chainedIntro", { from: "Nadia", to: "Dewi" }))).toBeInTheDocument();
    // The intermediary's name appears in the chain itself, readable in context.
    expect(screen.getAllByText("Farhan").length).toBeGreaterThan(0);
  });

  it("shows an honest explanation with no invented chain when the transfer has no path at all", () => {
    const transfer: Transfer = { fromIndex: 0, toIndex: 2, amountMinor: 30_000 };
    render(
      <TraceSheet
        open
        target={{ kind: "transfer", transfer } satisfies TraceSheetTarget}
        rows={ROWS}
        ledgers={[]}
        origins={[]}
        directTransfers={[]}
        currency="IDR"
        onClose={noop()}
      />,
    );

    const expectedBody = t("settle.trace.partialBody", { amount: formatMoney(30_000, "IDR") }).replace(/\u00a0/g, " ");
    expect(screen.getByText((content) => content.replace(/\u00a0/g, " ") === expectedBody)).toBeInTheDocument();
    expect(screen.queryByText(t("settle.trace.chainedIntro", { from: "Nadia", to: "Dewi" }))).not.toBeInTheDocument();
  });

  it("marks a transfer that matches its own pairwise debt as direct, with no chain shown", () => {
    const transfer: Transfer = { fromIndex: 1, toIndex: 0, amountMinor: 30_000 };
    render(
      <TraceSheet
        open
        target={{ kind: "transfer", transfer } satisfies TraceSheetTarget}
        rows={ROWS}
        ledgers={[]}
        origins={[]}
        directTransfers={[transfer]}
        currency="IDR"
        onClose={noop()}
      />,
    );

    expect(screen.getByText(t("settle.trace.directBody", { from: "Farhan", to: "Nadia" }))).toBeInTheDocument();
  });
});

describe("TraceSheet — closed or empty target", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <TraceSheet
        open={false}
        target={{ kind: "member", memberId: "m1" }}
        rows={ROWS}
        ledgers={LEDGERS}
        origins={ORIGINS}
        directTransfers={[]}
        currency="IDR"
        onClose={noop()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no target", () => {
    const { container } = render(
      <TraceSheet open target={undefined} rows={ROWS} ledgers={LEDGERS} origins={ORIGINS} directTransfers={[]} currency="IDR" onClose={noop()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
