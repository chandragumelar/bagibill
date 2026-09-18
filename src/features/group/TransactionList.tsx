import { useState } from "react";
import { t, dayLabel, formatMoney, startOfDay } from "@/lib/i18n";
import { Button, Sheet } from "@/shared/ui";
import type { TransactionListItem } from "./use-group-detail";
import { TransactionRow } from "./TransactionRow";
import styles from "./TransactionList.module.css";
import actionStyles from "./TransactionRow.module.css";

interface DayGroup {
  readonly dayStartMs: number;
  readonly subtotalMinor: number;
  readonly items: readonly TransactionListItem[];
}

// Items arrive already sorted descending by date (listExpensesByGroup) — this
// only detects day boundaries in that existing order, it never re-sorts.
function groupByDay(items: readonly TransactionListItem[]): readonly DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const dayStartMs = startOfDay(item.date);
    const current = groups.at(-1);
    if (current !== undefined && current.dayStartMs === dayStartMs) {
      groups[groups.length - 1] = {
        ...current,
        subtotalMinor: current.subtotalMinor + item.totalMinor,
        items: [...current.items, item],
      };
      continue;
    }
    groups.push({ dayStartMs, subtotalMinor: item.totalMinor, items: [item] });
  }
  return groups;
}

export interface TransactionListProps {
  readonly items: readonly TransactionListItem[];
  readonly currency: string;
  readonly nowMs: number;
  readonly onAddExpense: () => void;
  /** True when `items` is empty because a filter cut it down, not because the group has nothing yet. */
  readonly isFiltered?: boolean;
  readonly onClearFilter?: () => void;
  readonly onEditExpense?: (expenseId: string) => void;
  readonly onDeleteExpense?: (expenseId: string, title: string) => void;
  readonly highlightedExpenseId?: string;
}

export function TransactionList({ items, currency, nowMs, onAddExpense, isFiltered, onClearFilter, onEditExpense, onDeleteExpense, highlightedExpenseId }: TransactionListProps) {
  const [actionSheet, setActionSheet] = useState<{ expenseId: string; title: string; trigger: HTMLButtonElement } | undefined>();
  if (items.length === 0) {
    if (isFiltered === true && onClearFilter !== undefined) {
      return <FilteredEmpty onClearFilter={onClearFilter} />;
    }
    return <EmptyTransactions onAddExpense={onAddExpense} />;
  }

  const groups = groupByDay(items);

  function closeActionSheet(): void {
    const trigger = actionSheet?.trigger;
    setActionSheet(undefined);
    trigger?.focus();
  }

  function editExpense(): void {
    const expenseId = actionSheet?.expenseId;
    if (expenseId === undefined) return;
    closeActionSheet();
    onEditExpense?.(expenseId);
  }

  function deleteExpense(): void {
    const target = actionSheet;
    if (target === undefined) return;
    closeActionSheet();
    onDeleteExpense?.(target.expenseId, target.title);
  }

  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <div key={group.dayStartMs}>
          <div className={styles.daySeparator}>
            <span className={styles.dayLabel}>{dayLabel(group.dayStartMs, nowMs)}</span>
            <span className={`${styles.daySubtotal} bb-numeral`}>{formatMoney(group.subtotalMinor, currency)}</span>
          </div>
          <div className={styles.dayCard}>
            {group.items.map((item) => (
              <TransactionRowForList
                key={item.key}
                item={item}
                currency={currency}
                onEdit={onEditExpense}
                onDelete={onDeleteExpense}
                highlighted={item.key === highlightedExpenseId}
                actionSheet={actionSheet}
                onActionMenuOpen={setActionSheet}
              />
            ))}
          </div>
        </div>
      ))}
      <Sheet open={actionSheet !== undefined} onClose={closeActionSheet} title={actionSheet?.title ?? ""}>
        <div className={actionStyles.actionSheetActions}>
          <Button onClick={editExpense}>{t("group.transaction.edit")}</Button>
          <button type="button" className={actionStyles.actionSheetDelete} onClick={deleteExpense}>
            {t("group.transaction.delete")}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

interface TransactionRowForListProps {
  readonly item: TransactionListItem;
  readonly currency: string;
  readonly onEdit?: (expenseId: string) => void;
  readonly onDelete?: (expenseId: string, title: string) => void;
  readonly highlighted: boolean;
  readonly actionSheet: { expenseId: string; title: string; trigger: HTMLButtonElement } | undefined;
  readonly onActionMenuOpen: (target: { expenseId: string; title: string; trigger: HTMLButtonElement }) => void;
}

function TransactionRowForList({ item, currency, onEdit, onDelete, highlighted, actionSheet, onActionMenuOpen }: TransactionRowForListProps) {
  const expenseId = item.row.kind === "expense" ? item.row.expenseId : undefined;
  return (
    <TransactionRow
      row={item.row}
      currency={currency}
      onEdit={onEdit}
      onDelete={onDelete}
      highlighted={highlighted}
      actionMenuOpen={expenseId !== undefined && actionSheet?.expenseId === expenseId}
      onActionMenuOpen={expenseId === undefined ? undefined : (trigger) => onActionMenuOpen({ expenseId, title: item.title, trigger })}
    />
  );
}

interface EmptyTransactionsProps {
  readonly onAddExpense: () => void;
}

// No scan-receipt affordance here (unlike the mockup) — that feature isn't
// built yet (OCR is fase 2), and a button that leads nowhere is a dead
// affordance CLAUDE.md already rejected once at F3-01 (K-76).
function EmptyTransactions({ onAddExpense }: EmptyTransactionsProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden="true">
        🧾
      </div>
      <h2 className={styles.emptyHeading}>{t("common.noExpensesYet")}</h2>
      <p className={styles.emptyBody}>{t("group.transaction.emptyBody")}</p>
      <Button onClick={onAddExpense}>{t("group.transaction.emptyCta")}</Button>
    </div>
  );
}

interface FilteredEmptyProps {
  readonly onClearFilter: () => void;
}

// Distinct from EmptyTransactions on purpose (CLAUDE.md F3-06 instructions):
// a filter hiding every row isn't the same situation as a group with no
// expenses at all, and offers a different way out — clear the filter, not
// add an expense that's very likely already there.
function FilteredEmpty({ onClearFilter }: FilteredEmptyProps) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyHeading}>{t("group.transaction.filteredEmptyHeading")}</h2>
      <p className={styles.emptyBody}>{t("group.transaction.filteredEmptyBody")}</p>
      <Button onClick={onClearFilter} variant="secondary">
        {t("group.filter.clearButton")}
      </Button>
    </div>
  );
}
