import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTransactionFilter } from "./use-transaction-filter";
import type { FilterableTransaction } from "./transaction-filter";

interface Item extends FilterableTransaction {
  readonly key: string;
}

function makeItems(): Item[] {
  return [
    { key: "a", date: 1, title: "Sate Padang", notes: "", participantMemberIds: ["andi"] },
    { key: "b", date: 2, title: "Kopi Kenangan", notes: "", participantMemberIds: ["budi"] },
  ];
}

describe("useTransactionFilter", () => {
  it("updates the filtered result within the same render after a search text change", () => {
    const { result } = renderHook(() => useTransactionFilter(makeItems()));

    act(() => result.current.setSearchText("kopi"));

    expect(result.current.filteredItems.map((item) => item.key)).toEqual(["b"]);
  });

  it("returns every item again after clearing the filter", () => {
    const { result } = renderHook(() => useTransactionFilter(makeItems()));

    act(() => result.current.setSearchText("kopi"));
    expect(result.current.filteredItems).toHaveLength(1);

    act(() => result.current.clear());

    expect(result.current.filteredItems.map((item) => item.key)).toEqual(["a", "b"]);
  });

  it("reports isActive correctly as filters are applied and cleared", () => {
    const { result } = renderHook(() => useTransactionFilter(makeItems()));

    expect(result.current.isActive).toBe(false);

    act(() => result.current.setMemberIds(["andi"]));
    expect(result.current.isActive).toBe(true);

    act(() => result.current.clear());
    expect(result.current.isActive).toBe(false);
  });
});
