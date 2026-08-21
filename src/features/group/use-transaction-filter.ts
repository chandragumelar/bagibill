import { useMemo, useState } from "react";
import {
  EMPTY_TRANSACTION_FILTER,
  filterTransactions,
  isTransactionFilterActive,
  type FilterableTransaction,
  type TransactionFilterState,
} from "./transaction-filter";

export interface UseTransactionFilterResult<T extends FilterableTransaction> {
  readonly filter: TransactionFilterState;
  readonly filteredItems: readonly T[];
  readonly isActive: boolean;
  readonly setSearchText: (searchText: string) => void;
  readonly setMemberIds: (memberIds: readonly string[]) => void;
  readonly setDateRange: (startDate: number | undefined, endDate: number | undefined) => void;
  readonly clear: () => void;
}

// Filtered results are a derived value (useMemo), never a second copy of
// state that could drift from `items` — same call the codebase already made
// for split results at F3-01. No debounce on the search box: filtering runs
// over an in-memory array the size of one group's transactions, cheap enough
// that debouncing would only make typed letters lag behind the finger.
export function useTransactionFilter<T extends FilterableTransaction>(
  items: readonly T[],
): UseTransactionFilterResult<T> {
  const [filter, setFilter] = useState<TransactionFilterState>(EMPTY_TRANSACTION_FILTER);

  const filteredItems = useMemo(() => filterTransactions(items, filter), [items, filter]);

  return {
    filter,
    filteredItems,
    isActive: isTransactionFilterActive(filter),
    setSearchText: (searchText) => setFilter((current) => ({ ...current, searchText })),
    setMemberIds: (memberIds) => setFilter((current) => ({ ...current, memberIds })),
    setDateRange: (startDate, endDate) => setFilter((current) => ({ ...current, startDate, endDate })),
    clear: () => setFilter(EMPTY_TRANSACTION_FILTER),
  };
}
