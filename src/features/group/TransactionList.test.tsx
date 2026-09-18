import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
  it("opens one action sheet with full Edit and Delete actions", () => {
    render(<TransactionList items={[item()]} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: t("group.transaction.rowMenu", { title: "Sate Padang" }) }));
    const dialog = screen.getByRole("dialog", { name: "Sate Padang" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByRole("button", { name: t("group.transaction.edit") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("group.transaction.delete") })).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("routes Edit and Delete to the selected expense and returns focus on close", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<TransactionList items={[item()]} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} onEditExpense={onEdit} onDeleteExpense={onDelete} />);
    const trigger = screen.getByRole("button", { name: t("group.transaction.rowMenu", { title: "Sate Padang" }) });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: t("group.transaction.edit") }));
    expect(onEdit).toHaveBeenCalledWith("e1");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: t("group.transaction.delete") }));
    expect(onDelete).toHaveBeenCalledWith("e1", "Sate Padang");
  });

  it("closes from scrim and replaces an open sheet when another row opens", () => {
    const items = [
      item({ key: "e1", title: "Pertama", row: expenseRow({ expenseId: "e1", title: "Pertama" }) }),
      item({ key: "e2", title: "Kedua", row: expenseRow({ expenseId: "e2", title: "Kedua" }) }),
    ];
    render(<TransactionList items={items} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} />);
    const firstTrigger = screen.getByRole("button", { name: t("group.transaction.rowMenu", { title: "Pertama" }) });
    fireEvent.click(firstTrigger);
    fireEvent.click(screen.getByRole("button", { name: t("group.transaction.rowMenu", { title: "Kedua" }) }));
    expect(screen.getByRole("dialog", { name: "Kedua" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Pertama" })).not.toBeInTheDocument();
    const scrim = document.querySelector('[class*="scrim"]');
    if (scrim === null) throw new Error("expected sheet scrim");
    fireEvent.click(scrim);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["Pertama", "Tengah", "Terakhir"] as const)("opens action sheet for %s row", (title) => {
    const items = ["Pertama", "Tengah", "Terakhir"].map((rowTitle) => item({
      key: rowTitle,
      title: rowTitle,
      row: expenseRow({ expenseId: rowTitle, title: rowTitle }),
    }));
    render(<TransactionList items={items} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: t("group.transaction.rowMenu", { title }) }));
    expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
  });

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

  // Skill QA bagian 8: empty state hasil pencarian tidak boleh pakai
  // ilustrasi, beda dari EmptyTransactions (grup beneran kosong) yang boleh.
  it("shows the filtered-empty state without an illustration, distinct from the group-empty state", () => {
    render(
      <TransactionList items={[]} currency="IDR" nowMs={NOW_MS} onAddExpense={() => {}} isFiltered onClearFilter={() => {}} />,
    );

    expect(screen.getByText(t("group.transaction.filteredEmptyHeading"))).toBeInTheDocument();
    expect(document.querySelector('[class*="emptyArt"]')).not.toBeInTheDocument();
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
