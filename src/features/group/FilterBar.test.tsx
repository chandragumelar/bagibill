import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { FilterBar } from "./FilterBar";
import { EMPTY_TRANSACTION_FILTER, type TransactionFilterState } from "./transaction-filter";
import type { FilterMemberOption } from "./use-group-detail";

const MEMBERS: FilterMemberOption[] = [
  { memberId: "m1", name: "Andi" },
  { memberId: "m2", name: "Rina" },
];

function renderFilterBar(filter: TransactionFilterState = EMPTY_TRANSACTION_FILTER, isActive = false) {
  const handlers = {
    onSearchTextChange: vi.fn(),
    onMemberIdsChange: vi.fn(),
    onDateRangeChange: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <FilterBar
      filter={filter}
      isActive={isActive}
      members={MEMBERS}
      onSearchTextChange={handlers.onSearchTextChange}
      onMemberIdsChange={handlers.onMemberIdsChange}
      onDateRangeChange={handlers.onDateRangeChange}
      onClear={handlers.onClear}
    />,
  );
  return handlers;
}

describe("FilterBar", () => {
  it("gives the search box an accessible name", () => {
    renderFilterBar();
    expect(screen.getByRole("textbox", { name: t("group.filter.searchLabel") })).toBeInTheDocument();
  });

  it("calls onSearchTextChange when typing in the search box", () => {
    const handlers = renderFilterBar();
    fireEvent.change(screen.getByRole("textbox", { name: t("group.filter.searchLabel") }), {
      target: { value: "bensin" },
    });
    expect(handlers.onSearchTextChange).toHaveBeenCalledWith("bensin");
  });

  it("opens the filter sheet, with an accessible name for the people group and each person pill", () => {
    renderFilterBar();
    fireEvent.click(screen.getByRole("button", { name: t("group.filter.buttonLabel") }));

    expect(screen.getByRole("group", { name: t("group.filter.peopleGroupLabel") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Andi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rina" })).toBeInTheDocument();
  });

  it("toggles a person on and off via onMemberIdsChange", () => {
    const handlers = renderFilterBar();
    fireEvent.click(screen.getByRole("button", { name: t("group.filter.buttonLabel") }));

    fireEvent.click(screen.getByRole("button", { name: "Andi" }));
    expect(handlers.onMemberIdsChange).toHaveBeenCalledWith(["m1"]);
  });

  it("removes an already-selected person from the list instead of adding a duplicate", () => {
    const handlers = renderFilterBar({ ...EMPTY_TRANSACTION_FILTER, memberIds: ["m1"] });
    fireEvent.click(screen.getByRole("button", { name: t("group.filter.buttonLabel") }));

    fireEvent.click(screen.getByRole("button", { name: "Andi" }));
    expect(handlers.onMemberIdsChange).toHaveBeenCalledWith([]);
  });

  it("has labelled from/to date inputs and reports a change through onDateRangeChange", () => {
    const handlers = renderFilterBar();
    fireEvent.click(screen.getByRole("button", { name: t("group.filter.buttonLabel") }));

    const fromInput = screen.getByLabelText(t("group.filter.dateFromLabel"));
    fireEvent.change(fromInput, { target: { value: "2026-08-01" } });

    expect(handlers.onDateRangeChange).toHaveBeenCalledWith(new Date(2026, 7, 1).getTime(), undefined);
  });

  it("renders the not-yet-built filters visibly but disabled, not hidden", () => {
    renderFilterBar();
    fireEvent.click(screen.getByRole("button", { name: t("group.filter.buttonLabel") }));

    expect(screen.getByRole("button", { name: t("group.filter.categoryLabel") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("group.filter.amountRangeLabel") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("group.filter.currencyLabel") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("group.filter.hasAttachmentLabel") })).toBeDisabled();
  });

  it("calls onClear when the clear-filters button is pressed", () => {
    const handlers = renderFilterBar();
    fireEvent.click(screen.getByRole("button", { name: t("group.filter.buttonLabel") }));

    fireEvent.click(screen.getByRole("button", { name: t("group.filter.clearButton") }));
    expect(handlers.onClear).toHaveBeenCalledOnce();
  });

  it("shows an active-filter marker on the toolbar filter button when a filter is applied", () => {
    renderFilterBar(EMPTY_TRANSACTION_FILTER, true);
    expect(screen.getByRole("button", { name: new RegExp(t("group.filter.activeState")) })).toBeInTheDocument();
  });
});
