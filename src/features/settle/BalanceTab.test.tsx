import "fake-indexeddb/auto";
import type { MutableRefObject } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { db } from "@/lib/storage/schema";
import type { GroupBalanceState } from "./use-group-balance";
import { BalanceTab } from "./BalanceTab";

// ReadyBalance renders SuggestedTransfers/BalanceList/SettlementHistory
// behind useSettleActions, which loads settlements from real storage
// (F3-07 bagian 2) — same reasoning as GroupDetailScreen.test.tsx's own
// fake-indexeddb setup. Fixtures below use a groupSlug ("g1") with no
// seeded settlements, so every load here resolves to an empty list.
beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.settlements.clear(), db.groups.clear(), db.members.clear()]);
});

// createSettlement (settlement-repository.ts) validates fromMemberId/
// toMemberId/currency against a real group+members record — needed only by
// the commitPendingRef test below, which actually saves a settlement rather
// than just rendering the ready-state props.
async function seedGroupAndMembers(): Promise<void> {
  await db.groups.add({
    slug: "g1",
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "blank",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await db.members.bulkAdd([
    { memberId: "m1", groupSlug: "g1", name: "Nadia", color: "--m-1", joinedAt: 1_000, seq: 0 },
    { memberId: "m2", groupSlug: "g1", name: "Farhan", color: "--m-2", joinedAt: 1_000, seq: 0 },
  ]);
}

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
    pendingClaimExpenseCount: 0,
    uncountedExpenseCount: 0,
    settlementCount: 0,
    groupSlug: "g1",
    groupName: "Trip Bali",
    ledgers: [],
    origins: [],
    reload: () => {},
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

  it("shows the pending-claim notice when a byItems expense is still waiting on claims", () => {
    render(
      <BalanceTab balance={readyState({ pendingClaimExpenseCount: 1 })} highlightSignal={0} onAddExpense={vi.fn()} />,
    );
    expect(screen.getByText(t("group.balance.pendingClaimNotice", { count: 1 }))).toBeInTheDocument();
  });

  it("does not show the pending-claim notice when nothing is waiting on claims", () => {
    render(<BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} />);
    expect(screen.queryByText(t("group.balance.pendingClaimNotice", { count: 1 }))).not.toBeInTheDocument();
  });

  // K-122: this is the sharpest way to get "semua sudah beres" wrong — every
  // visible row nets to zero, so it LOOKS settled, but real money (the
  // pending expense) hasn't been counted at all yet.
  it("never claims everyone is settled while a pending-claim expense hasn't joined the balance, even if every row nets to zero", () => {
    render(
      <BalanceTab
        balance={readyState({
          rows: [
            { memberId: "m1", name: "Nadia", color: "--m-1", netMinor: 0, isCurrentMember: true, isInactive: false },
            { memberId: "m2", name: "Farhan", color: "--m-2", netMinor: 0, isCurrentMember: false, isInactive: false },
          ],
          simplifiedTransfers: [],
          directTransfers: [],
          pendingClaimExpenseCount: 1,
          position: { memberId: "m1", netMinor: 0, directInboundCount: 0, directOutboundCount: 0 },
        })}
        highlightSignal={0}
        onAddExpense={vi.fn()}
      />,
    );

    expect(screen.queryByText(t("group.balance.doneHeading"))).not.toBeInTheDocument();
    expect(screen.getByText(t("group.balance.pendingClaimNotice", { count: 1 }))).toBeInTheDocument();
  });

  it("flashes the current member's row when the highlight signal changes", () => {
    const { rerender, container } = render(
      <BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} />,
    );
    expect(container.querySelector('[class*="highlighted"]')).not.toBeInTheDocument();

    rerender(<BalanceTab balance={readyState()} highlightSignal={1} onAddExpense={vi.fn()} />);

    expect(container.querySelector('[class*="highlighted"]')).toBeInTheDocument();
  });

  // F4-01b: GroupDetailScreen unmounts this tab on tab switch, so it must
  // reach for commitPendingRef before that happens — this proves the ref
  // is wired to the real undo queue's commitAll, not a stub.
  it("finalizes a pending settlement's undo toast when commitPendingRef.current is invoked", async () => {
    await seedGroupAndMembers();
    const commitPendingRef: MutableRefObject<(() => void) | undefined> = { current: undefined };
    render(
      <BalanceTab balance={readyState()} highlightSignal={0} onAddExpense={vi.fn()} commitPendingRef={commitPendingRef} />,
    );

    const markSettledButton = screen.getAllByText(t("settle.action.markSettled")).at(0);
    if (markSettledButton === undefined) throw new Error("expected at least one markSettled button");
    fireEvent.click(markSettledButton);
    fireEvent.click(screen.getByText(t("settle.form.saveButton")));
    expect(await screen.findByRole("status")).toBeInTheDocument();

    expect(commitPendingRef.current).toBeDefined();
    commitPendingRef.current?.();

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
