import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { t, formatMoney as formatMoneyRaw } from "@/lib/i18n";
import { TransactionList } from "./TransactionList";
import type { TransactionListItem } from "./use-group-detail";
import type { ExpenseTransactionRow } from "./TransactionRow";

// RTL's default text matcher normalizes DOM whitespace (including Intl's
// non-breaking space between currency and amount) before comparing — same
// treatment other test files in this repo already apply.
function formatMoney(amountMinor: number, currency: string): string {
  return formatMoneyRaw(amountMinor, currency).replace(/\u00a0/g, " ");
}

const NOW_MS = new Date(2026, 7, 22, 12, 0, 0).getTime();
const TODAY_MS = new Date(2026, 7, 22, 9, 0, 0).getTime();
const YESTERDAY_MS = new Date(2026, 7, 21, 20, 0, 0).getTime();

function expenseRow(overrides: Partial<ExpenseTransactionRow> = {}): ExpenseTransactionRow {
  return {
    kind: "expense",
    expenseId: "e1",
    title: "Sate Padang",
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

function item(overrides: Partial<TransactionListItem> = {}): TransactionListItem {
  return {
    key: "e1",
    date: TODAY_MS,
    totalMinor: 60_000,
    title: "Sate Padang",
    notes: "",
    participantMemberIds: [],
    row: expenseRow(),
    ...overrides,
  };
}

describe("TransactionList", () => {
  it("renders the empty state with a working add-expense action", () => {
    const onAddExpense = vi.fn();
    render(<TransactionList items={[]} currency="IDR" nowMs={NOW_MS} onAddExpense={onAddExpense} />);

    expect(screen.getByText(t("common.noExpensesYet"))).toBeInTheDocument();
    screen.getByText(t("group.transaction.emptyCta")).closest("button")?.click();
    expect(onAddExpense).toHaveBeenCalledOnce();
  });

  it("groups rows under Hari ini / Kemarin with a subtotal per day", () => {
    const items: TransactionListItem[] = [
      item({ key: "e1", date: TODAY_MS, totalMinor: 60_000, row: expenseRow({ expenseId: "e1", title: "Sate Padang" }) }),
      item({ key: "e2", date: YESTERDAY_MS, totalMinor: 132_000, row: expenseRow({ expenseId: "e2", title: "Sewa snorkeling" }) }),
    ];
    render(<TransactionList items={items} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} />);

    expect(screen.getByText(t("group.transaction.dayToday"))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.dayYesterday"))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(60_000, "IDR"))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(132_000, "IDR"))).toBeInTheDocument();
  });

  it("keeps the given order (already date-descending), never re-sorting", () => {
    const items: TransactionListItem[] = [
      item({ key: "e1", date: TODAY_MS, row: expenseRow({ expenseId: "e1", title: "Kedua" }) }),
      item({ key: "e2", date: TODAY_MS, row: expenseRow({ expenseId: "e2", title: "Pertama" }) }),
    ];
    render(<TransactionList items={items} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} />);

    const titles = screen.getAllByText(/Kedua|Pertama/).map((el) => el.textContent);
    expect(titles).toEqual(["Kedua", "Pertama"]);
  });
});
