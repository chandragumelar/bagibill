import { describe, expect, it } from "vitest";
import {
  EMPTY_TRANSACTION_FILTER,
  filterTransactions,
  isTransactionFilterActive,
  type FilterableTransaction,
  type TransactionFilterState,
} from "./transaction-filter";

const DAY_MS = 24 * 60 * 60 * 1000;
// Local noon, not UTC — filterTransactions buckets by local calendar day, so
// these fixtures need to land unambiguously on one local day regardless of
// which timezone the test runner uses.
const AUG_1 = new Date(2026, 7, 1, 12, 0, 0).getTime();
const AUG_15 = new Date(2026, 7, 15, 12, 0, 0).getTime();
const AUG_31 = new Date(2026, 7, 31, 12, 0, 0).getTime();

function makeItem(overrides: Partial<FilterableTransaction> & { key: string }): FilterableTransaction & { key: string } {
  return {
    date: AUG_15,
    title: "Untitled",
    notes: "",
    participantMemberIds: [],
    ...overrides,
  };
}

const cafe = makeItem({ key: "cafe", title: "Café Kenangan", notes: "", date: AUG_1 });
const bensin = makeItem({ key: "bensin", title: "Bensin Cirebon", notes: "isi penuh sebelum jalan", date: AUG_15 });
const villa = makeItem({ key: "villa", title: "Villa Uluwatu", notes: "", date: AUG_31, participantMemberIds: ["andi", "budi"] });
const sample = [cafe, bensin, villa];

describe("filterTransactions", () => {
  it("returns every item in the same order when the filter is empty", () => {
    expect(filterTransactions(sample, EMPTY_TRANSACTION_FILTER)).toEqual(sample);
  });

  it("matches search text against the title", () => {
    const result = filterTransactions(sample, { ...EMPTY_TRANSACTION_FILTER, searchText: "bensin" });
    expect(result.map((item) => item.key)).toEqual(["bensin"]);
  });

  it("matches search text against notes", () => {
    const result = filterTransactions(sample, { ...EMPTY_TRANSACTION_FILTER, searchText: "isi penuh" });
    expect(result.map((item) => item.key)).toEqual(["bensin"]);
  });

  it("is case-insensitive", () => {
    const result = filterTransactions(sample, { ...EMPTY_TRANSACTION_FILTER, searchText: "BENSIN" });
    expect(result.map((item) => item.key)).toEqual(["bensin"]);
  });

  it("ignores diacritics on both sides of the match", () => {
    const result = filterTransactions(sample, { ...EMPTY_TRANSACTION_FILTER, searchText: "cafe" });
    expect(result.map((item) => item.key)).toEqual(["cafe"]);
  });

  it("collapses repeated whitespace before matching", () => {
    const result = filterTransactions(sample, { ...EMPTY_TRANSACTION_FILTER, searchText: "  isi   penuh  " });
    expect(result.map((item) => item.key)).toEqual(["bensin"]);
  });

  it("catches a person who was only treated, never a payer, when filtered by name", () => {
    const treated = makeItem({ key: "treated", title: "Makan bareng", participantMemberIds: ["citra"] });
    const result = filterTransactions([treated], { ...EMPTY_TRANSACTION_FILTER, memberIds: ["citra"] });
    expect(result.map((item) => item.key)).toEqual(["treated"]);
  });

  it("matches an expense involving any one of several selected people, not all of them at once", () => {
    const onlyAndi = makeItem({ key: "only-andi", participantMemberIds: ["andi"] });
    const onlyDewi = makeItem({ key: "only-dewi", participantMemberIds: ["dewi"] });
    const neither = makeItem({ key: "neither", participantMemberIds: ["eko"] });
    const result = filterTransactions([onlyAndi, onlyDewi, neither], {
      ...EMPTY_TRANSACTION_FILTER,
      memberIds: ["andi", "dewi"],
    });
    expect(result.map((item) => item.key)).toEqual(["only-andi", "only-dewi"]);
  });

  it("includes both endpoints of a date range", () => {
    const filter: TransactionFilterState = { ...EMPTY_TRANSACTION_FILTER, startDate: AUG_1, endDate: AUG_31 };
    expect(filterTransactions(sample, filter).map((item) => item.key)).toEqual(["cafe", "bensin", "villa"]);
  });

  it("excludes a transaction the instant it falls outside the end date", () => {
    const dayAfter = makeItem({ key: "day-after", date: AUG_31 + DAY_MS });
    const filter: TransactionFilterState = { ...EMPTY_TRANSACTION_FILTER, endDate: AUG_31 };
    expect(filterTransactions([villa, dayAfter], filter).map((item) => item.key)).toEqual(["villa"]);
  });

  it("leaves the range open on the end not supplied", () => {
    const startOnly: TransactionFilterState = { ...EMPTY_TRANSACTION_FILTER, startDate: AUG_15 };
    expect(filterTransactions(sample, startOnly).map((item) => item.key)).toEqual(["bensin", "villa"]);

    const endOnly: TransactionFilterState = { ...EMPTY_TRANSACTION_FILTER, endDate: AUG_15 };
    expect(filterTransactions(sample, endOnly).map((item) => item.key)).toEqual(["cafe", "bensin"]);
  });

  it("applies text, person, and date filters together", () => {
    const target = makeItem({ key: "target", title: "Sewa motor", date: AUG_15, participantMemberIds: ["andi"] });
    const wrongPerson = makeItem({ key: "wrong-person", title: "Sewa motor", date: AUG_15, participantMemberIds: ["budi"] });
    const wrongDate = makeItem({ key: "wrong-date", title: "Sewa motor", date: AUG_31, participantMemberIds: ["andi"] });
    const wrongText = makeItem({ key: "wrong-text", title: "Sewa mobil", date: AUG_15, participantMemberIds: ["andi"] });
    const filter: TransactionFilterState = {
      searchText: "sewa motor",
      memberIds: ["andi"],
      startDate: AUG_1,
      endDate: AUG_15,
    };
    const result = filterTransactions([target, wrongPerson, wrongDate, wrongText], filter);
    expect(result.map((item) => item.key)).toEqual(["target"]);
  });

  it("keeps a broken row in the results, filtering it by whatever the record still has", () => {
    const broken = makeItem({ key: "broken", title: "Struk rusak", notes: "", participantMemberIds: ["andi"] });
    const result = filterTransactions([broken], { ...EMPTY_TRANSACTION_FILTER, memberIds: ["andi"] });
    expect(result.map((item) => item.key)).toEqual(["broken"]);
  });

  it("never drops a broken row silently when a filter is active but it still matches", () => {
    const broken = makeItem({ key: "broken", title: "Struk rusak", date: AUG_15 });
    const filter: TransactionFilterState = { ...EMPTY_TRANSACTION_FILTER, startDate: AUG_1, endDate: AUG_31 };
    expect(filterTransactions([broken], filter).map((item) => item.key)).toEqual(["broken"]);
  });
});

describe("isTransactionFilterActive", () => {
  it("is false for the empty filter", () => {
    expect(isTransactionFilterActive(EMPTY_TRANSACTION_FILTER)).toBe(false);
  });

  it("is true when search text is set", () => {
    expect(isTransactionFilterActive({ ...EMPTY_TRANSACTION_FILTER, searchText: "x" })).toBe(true);
  });

  it("is true when at least one member is selected", () => {
    expect(isTransactionFilterActive({ ...EMPTY_TRANSACTION_FILTER, memberIds: ["andi"] })).toBe(true);
  });

  it("is true when only a start or end date is set", () => {
    expect(isTransactionFilterActive({ ...EMPTY_TRANSACTION_FILTER, startDate: AUG_1 })).toBe(true);
    expect(isTransactionFilterActive({ ...EMPTY_TRANSACTION_FILTER, endDate: AUG_31 })).toBe(true);
  });
});
