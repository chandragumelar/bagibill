import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatMoney, t } from "@/lib/i18n";
import { TransactionRow } from "./TransactionRow";
import type { ExpenseTransactionRow, SettlementTransactionRow } from "./TransactionRow";
import styles from "./TransactionRow.module.css";

function money(amountMinor: number): string {
  return formatMoney(amountMinor, "IDR").replace(/\u00a0/g, " ");
}

function expenseRow(overrides: Partial<ExpenseTransactionRow> = {}): ExpenseTransactionRow {
  return {
    kind: "expense",
    expenseId: "e1",
    title: "Sate Padang Ajo Ramon",
    payerNames: ["Andi"],
    isCurrentMemberPayer: false,
    payerAvatarInitials: "A",
    payerAvatarColor: "--m-2",
    hasAttachment: false,
    isPerItemMode: false,
    effect: { kind: "owed", netMinor: -60_000 },
    ...overrides,
  };
}

describe("TransactionRow — expense variants", () => {
  it("reserves a separate menu slot beside long transaction content", () => {
    render(
      <TransactionRow
        row={expenseRow({
          title: "Penginapan keluarga dekat pantai dengan biaya tambahan panjang",
          foreignAmountMinor: 123_456_789,
          foreignCurrency: "KWD",
          effect: { kind: "owed", netMinor: -987_654_321 },
        })}
        currency="IDR"
      />,
    );

    const menuButton = screen.getByRole("button", {
      name: t("group.transaction.rowMenu", { title: "Penginapan keluarga dekat pantai dengan biaya tambahan panjang" }),
    });
    const menuSlot = menuButton.parentElement;
    expect(menuSlot?.className).toContain(styles.menuSlot ?? "menuSlot");
    expect(menuSlot?.parentElement?.className).toContain(styles.expenseRow ?? "expenseRow");
    expect(menuSlot?.parentElement?.children).toHaveLength(2);
    expect(menuSlot?.previousElementSibling?.tagName).toBe("BUTTON");
    expect(menuSlot?.previousElementSibling).toHaveAttribute("type", "button");
  });

  it("does not edit when the action trigger is tapped", () => {
    const onEdit = vi.fn();
    const onOpen = vi.fn();
    render(<TransactionRow row={expenseRow()} currency="IDR" onEdit={onEdit} onActionMenuOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: t("group.transaction.rowMenu", { title: "Sate Padang Ajo Ramon" }) }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("deletes only after a left swipe passes 90px", () => {
    const onDelete = vi.fn();
    const { container } = render(<TransactionRow row={expenseRow()} currency="IDR" onDelete={onDelete} />);
    const front = container.querySelector('[class*="swipeFront"]');
    if (front === null) throw new Error("expected swipe surface");
    fireEvent.pointerDown(front, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(front, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(front, { clientX: 120, pointerId: 1 });
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.pointerDown(front, { clientX: 200, pointerId: 2 });
    fireEvent.pointerMove(front, { clientX: 100, pointerId: 2 });
    fireEvent.pointerUp(front, { clientX: 100, pointerId: 2 });
    expect(onDelete).toHaveBeenCalledWith("e1", "Sate Padang Ajo Ramon");
  });
  it("renders a negative effect: bagianmu, someone else paid", () => {
    render(<TransactionRow row={expenseRow()} currency="IDR" />);
    expect(screen.getByText("Sate Padang Ajo Ramon")).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.payerOther", { name: "Andi" }))).toBeInTheDocument();
    expect(screen.getByText(money(-60_000))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.yourShare"))).toBeInTheDocument();
  });

  it("renders a positive effect: buat kamu, kamu bayar", () => {
    const row = expenseRow({
      title: "Kopi Kenangan",
      payerNames: ["Kamu"],
      isCurrentMemberPayer: true,
      effect: { kind: "credit", netMinor: 72_000 },
    });
    render(<TransactionRow row={row} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.payerYou"))).toBeInTheDocument();
    expect(screen.getByText(money(72_000))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.forYou"))).toBeInTheDocument();
  });

  it("renders the out (not-involved) effect and mutes the row", () => {
    const row = expenseRow({ title: "Laundry baju Sarah", payerNames: ["Sarah"], effect: { kind: "out" } });
    render(<TransactionRow row={row} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.notInvolvedAmount"))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.notInvolvedLabel"))).toBeInTheDocument();
  });

  it("renders an even (settled) effect without a plus or minus sign", () => {
    const row = expenseRow({ effect: { kind: "even" } });
    render(<TransactionRow row={row} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.settled"))).toBeInTheDocument();
    expect(screen.getByText(money(0))).toBeInTheDocument();
  });

  it("shows the per-item split mode mark", () => {
    render(<TransactionRow row={expenseRow({ isPerItemMode: true })} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.perItemBadge"))).toBeInTheDocument();
  });

  it("shows the attachment mark", () => {
    render(<TransactionRow row={expenseRow({ hasAttachment: true })} currency="IDR" />);
    expect(screen.getByLabelText(t("group.transaction.attachmentLabel"))).toBeInTheDocument();
  });

  it("shows the original foreign-currency amount alongside the converted effect", () => {
    const row = expenseRow({
      title: "Sewa alat snorkeling",
      payerNames: ["Dewi"],
      foreignAmountMinor: 4_500,
      foreignCurrency: "SGD",
      effect: { kind: "owed", netMinor: -132_000 },
    });
    render(<TransactionRow row={row} currency="IDR" />);
    expect(screen.getByText("SGD")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(formatMoney(4_500, "SGD").replace(/\u00a0/g, " ")))).toBeInTheDocument();
    expect(screen.getByText(money(-132_000))).toBeInTheDocument();
  });

  it("shows a multi-payer count when more than one person paid", () => {
    const row = expenseRow({ payerNames: ["Andi", "Rina"] });
    render(<TransactionRow row={row} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.payerMultiple", { count: 2 }))).toBeInTheDocument();
  });
});

function settlementRow(overrides: Partial<SettlementTransactionRow> = {}): SettlementTransactionRow {
  return { kind: "settlement", settlementId: "s1", counterpartyName: "Budi", direction: "received", amountMinor: 250_000, ...overrides };
}

describe("TransactionRow — settlement variants", () => {
  it("renders a settlement received", () => {
    render(<TransactionRow row={settlementRow()} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.settlementTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.settlementReceived", { name: "Budi" }))).toBeInTheDocument();
    expect(screen.getByText(money(250_000))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.settlementReceivedLabel"))).toBeInTheDocument();
  });

  it("renders a settlement paid, shown as a negative amount", () => {
    const row = settlementRow({ direction: "paid", counterpartyName: "Andi", amountMinor: 180_000 });
    render(<TransactionRow row={row} currency="IDR" />);
    expect(screen.getByText(t("group.transaction.settlementPaid", { name: "Andi" }))).toBeInTheDocument();
    expect(screen.getByText(money(-180_000))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.settlementPaidLabel"))).toBeInTheDocument();
  });
});

describe("TransactionRow — broken variant", () => {
  it("renders an honest failure message instead of crashing", () => {
    render(<TransactionRow row={{ kind: "broken", expenseId: "e1" }} currency="IDR" />);
    expect(screen.getByRole("alert")).toHaveTextContent(t("group.transaction.brokenRow"));
  });
});
