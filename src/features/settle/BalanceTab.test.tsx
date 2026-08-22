import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import type { GroupBalanceState } from "./use-group-balance";
import { BalanceTab } from "./BalanceTab";

function readyState(overrides: Partial<Extract<GroupBalanceState, { status: "ready" }>> = {}): GroupBalanceState {
  return {
    status: "ready",
    currency: "IDR",
    rows: [
      { memberId: "m1", name: "Nadia", color: "--m-1", netMinor: 30_000, isCurrentMember: true, isInactive: false },
      { memberId: "m2", name: "Farhan", color: "--m-2", netMinor: -30_000, isCurrentMember: false, isInactive: false },
    ],
    simplifiedTransfers: [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }],
    directTransfers: [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }],
    initialMode: "simplified",
    position: { memberId: "m1", netMinor: 30_000, directInboundCount: 1, directOutboundCount: 0 },
    expenseCount: 3,
    uncountedExpenseCount: 0,
    ...overrides,
  };
}

describe("BalanceTab", () => {
  it("reaches the Ringkas (simplified) mockup state by default", () => {
    render(<BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} />);
    expect(screen.getByRole("button", { name: t("group.balance.modeSimplified") })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reaches the Langsung (direct) mockup state through a real tap on the toggle", () => {
    render(<BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: t("group.balance.modeDirect") }));

    expect(screen.getByRole("button", { name: t("group.balance.modeDirect") })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(t("group.balance.networkCaptionDirect"))).toBeInTheDocument();
  });

  it("reaches the semua-lunas mockup state when every balance nets to zero", () => {
    render(
      <BalanceTab
        balance={readyState({
          rows: [
            { memberId: "m1", name: "Nadia", color: "--m-1", netMinor: 0, isCurrentMember: true, isInactive: false },
            { memberId: "m2", name: "Farhan", color: "--m-2", netMinor: 0, isCurrentMember: false, isInactive: false },
          ],
          simplifiedTransfers: [],
          directTransfers: [],
          position: { memberId: "m1", netMinor: 0, directInboundCount: 0, directOutboundCount: 0 },
        })}
        highlightSignal={0}
        onAddExpense={vi.fn()}
      />,
    );

    expect(screen.getByText(t("group.balance.doneHeading"))).toBeInTheDocument();
  });

  it("reaches the belum-ada-transaksi mockup state for a group with no expenses", () => {
    render(<BalanceTab balance={{ status: "empty" }} highlightSignal={0} onAddExpense={vi.fn()} />);
    expect(screen.getByText(t("group.balance.emptyHeading"))).toBeInTheDocument();
  });

  it("shows the uncounted-expenses warning when some expenses failed to calculate", () => {
    render(
      <BalanceTab balance={readyState({ uncountedExpenseCount: 2 })} highlightSignal={0} onAddExpense={vi.fn()} />,
    );
    expect(screen.getByText(t("group.balance.uncountedWarning", { count: 2 }))).toBeInTheDocument();
  });

  it("does not show the uncounted-expenses warning when nothing was excluded", () => {
    render(<BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} />);
    expect(screen.queryByText(t("group.balance.uncountedWarning", { count: 1 }))).not.toBeInTheDocument();
  });

  it("does not claim everyone is settled when balances are zero only because expenses were excluded", () => {
    render(
      <BalanceTab
        balance={readyState({
          rows: [
            { memberId: "m1", name: "Nadia", color: "--m-1", netMinor: 0, isCurrentMember: true, isInactive: false },
          ],
          simplifiedTransfers: [],
          directTransfers: [],
          uncountedExpenseCount: 1,
          position: { memberId: "m1", netMinor: 0, directInboundCount: 0, directOutboundCount: 0 },
        })}
        highlightSignal={0}
        onAddExpense={vi.fn()}
      />,
    );

    expect(screen.queryByText(t("group.balance.doneHeading"))).not.toBeInTheDocument();
    expect(screen.getByText(t("group.balance.uncountedWarning", { count: 1 }))).toBeInTheDocument();
  });

  it("flashes the current member's row when the highlight signal changes", () => {
    const { rerender, container } = render(
      <BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} />,
    );
    expect(container.querySelector('[class*="highlighted"]')).not.toBeInTheDocument();

    rerender(<BalanceTab balance={readyState()} highlightSignal={1} onAddExpense={vi.fn()} />);

    expect(container.querySelector('[class*="highlighted"]')).toBeInTheDocument();
  });
});
