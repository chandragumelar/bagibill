import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { t, formatMoney } from "@/lib/i18n";
import { TransactionRow } from "./TransactionRow";
import type { ExpenseTransactionRow, SettlementTransactionRow } from "./TransactionRow";

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
