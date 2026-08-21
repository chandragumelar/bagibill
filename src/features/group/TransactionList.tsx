import { t, formatDate, formatMoney } from "@/lib/i18n";
import { Button } from "@/shared/ui/Button/Button";
import type { TransactionListItem } from "./use-group-detail";
import { TransactionRow } from "./TransactionRow";
import styles from "./TransactionList.module.css";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function dayLabel(dayStartMs: number, nowMs: number): string {
  const diffDays = Math.round((startOfDay(nowMs) - dayStartMs) / MS_PER_DAY);
  if (diffDays === 0) return t("group.transaction.dayToday");
  if (diffDays === 1) return t("group.transaction.dayYesterday");
  return formatDate(new Date(dayStartMs), { day: "numeric", month: "short" });
}

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
}

export function TransactionList({ items, currency, nowMs, onAddExpense, isFiltered, onClearFilter }: TransactionListProps) {
  if (items.length === 0) {
    if (isFiltered === true && onClearFilter !== undefined) {
      return <FilteredEmpty onClearFilter={onClearFilter} />;
    }
    return <EmptyTransactions onAddExpense={onAddExpense} />;
  }

  const groups = groupByDay(items);

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
              <TransactionRow key={item.key} row={item.row} currency={currency} />
            ))}
          </div>
        </div>
      ))}
    </div>
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
      <div className={styles.emptyArt} aria-hidden="true">
        🔍
      </div>
      <h2 className={styles.emptyHeading}>{t("group.transaction.filteredEmptyHeading")}</h2>
      <p className={styles.emptyBody}>{t("group.transaction.filteredEmptyBody")}</p>
      <Button onClick={onClearFilter} variant="secondary">
        {t("group.filter.clearButton")}
      </Button>
    </div>
  );
}
