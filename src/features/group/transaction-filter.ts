// Pure filtering over an already-loaded transaction list. No React, no
// storage, no clock — every timestamp it touches comes in as a parameter.

const WHITESPACE_PATTERN = /\s+/g;
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TransactionFilterState {
  readonly searchText: string;
  readonly memberIds: readonly string[];
  readonly startDate?: number;
  readonly endDate?: number;
}

export const EMPTY_TRANSACTION_FILTER: TransactionFilterState = {
  searchText: "",
  memberIds: [],
};

// The minimum a row needs to be filterable — TransactionListItem extends
// this, so filterTransactions can run on the real list without a remap step.
export interface FilterableTransaction {
  readonly date: number;
  readonly title: string;
  readonly notes: string;
  /** Everyone the expense involves: every split participant (even a treated
   * person with a zero share) plus every payer. Not just who paid. */
  readonly participantMemberIds: readonly string[];
}

// Own normalizer, not a reuse of storage's normalizeMemberName — same
// trim/lowercase/NFD-strip shape, but that one speaks member-dedup, not
// search. Candidate for a shared normalizer if a third caller shows up.
function normalizeSearchText(raw: string): string {
  return raw
    .trim()
    .replace(WHITESPACE_PATTERN, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS_PATTERN, "");
}

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isTransactionFilterActive(filter: TransactionFilterState): boolean {
  return (
    filter.searchText.trim() !== "" ||
    filter.memberIds.length > 0 ||
    filter.startDate !== undefined ||
    filter.endDate !== undefined
  );
}

function matchesSearchText(item: FilterableTransaction, searchText: string): boolean {
  const normalizedQuery = normalizeSearchText(searchText);
  if (normalizedQuery === "") return true;
  return (
    normalizeSearchText(item.title).includes(normalizedQuery) ||
    normalizeSearchText(item.notes).includes(normalizedQuery)
  );
}

// Any of the selected people, not all of them — picking two people asks
// "expenses involving either of these two", the question the transaction
// list actually gets asked, not "expenses involving both at once".
function matchesMembers(item: FilterableTransaction, memberIds: readonly string[]): boolean {
  if (memberIds.length === 0) return true;
  return memberIds.some((memberId) => item.participantMemberIds.includes(memberId));
}

// Both ends inclusive, and each end compares by calendar day (not raw ms) so
// a start/end date picked from a date input always includes that whole day.
function matchesDateRange(item: FilterableTransaction, startDate?: number, endDate?: number): boolean {
  if (startDate !== undefined && item.date < startOfDay(startDate)) return false;
  if (endDate !== undefined && item.date >= startOfDay(endDate) + MS_PER_DAY) return false;
  return true;
}

// Broken rows (calculation failed at F3-05) still carry title/notes/date and
// a best-effort participant list read straight off the record, so they stay
// filterable instead of silently vanishing from a filtered list.
export function filterTransactions<T extends FilterableTransaction>(
  items: readonly T[],
  filter: TransactionFilterState,
): readonly T[] {
  return items.filter(
    (item) =>
      matchesSearchText(item, filter.searchText) &&
      matchesMembers(item, filter.memberIds) &&
      matchesDateRange(item, filter.startDate, filter.endDate),
  );
}
