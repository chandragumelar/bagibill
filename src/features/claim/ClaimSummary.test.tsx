import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatMoney, t } from "@/lib/i18n";
import { ClaimSummary } from "./ClaimSummary";
import type { MyItemShare } from "./claim-actions";

// Intl inserts a non-breaking space between "IDR" and the number; RTL's
// text normalizer collapses that in the DOM but not in a raw query string.
function money(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency).replace(/\u00a0/g, " ");
}

function myItems(): MyItemShare[] {
  return [
    { itemId: "i1", name: "Cumi Goreng Tepung", shareMinor: 42_000, claimantCount: 1 },
    { itemId: "i2", name: "Nasi Putih", shareMinor: 1_200, claimantCount: 5 },
  ];
}

describe("ClaimSummary", () => {
  it("shows the expense title and the grand total", () => {
    render(<ClaimSummary expenseTitle="Makan Malam Tim" currency="IDR" totalMinor={43_200} items={myItems()} onBack={vi.fn()} />);

    expect(screen.getByText(t("claim.summary.subtitle", { expenseTitle: "Makan Malam Tim" }))).toBeInTheDocument();
    expect(screen.getByText(money(43_200, "IDR"))).toBeInTheDocument();
  });

  it("lists each item with its amount, noting when an item was shared", () => {
    render(<ClaimSummary expenseTitle="Makan Malam Tim" currency="IDR" totalMinor={43_200} items={myItems()} onBack={vi.fn()} />);

    expect(screen.getByText("Cumi Goreng Tepung")).toBeInTheDocument();
    expect(screen.getByText(money(42_000, "IDR"))).toBeInTheDocument();
    expect(screen.getByText(t("claim.summary.sharedWith", { count: 5 }))).toBeInTheDocument();
  });

  it("doesn't show a shared-with note for an item claimed alone", () => {
    render(<ClaimSummary expenseTitle="Makan Malam Tim" currency="IDR" totalMinor={43_200} items={myItems()} onBack={vi.fn()} />);

    expect(screen.queryByText(t("claim.summary.sharedWith", { count: 1 }))).not.toBeInTheDocument();
  });

  it("calls onBack when the back button is tapped", () => {
    const onBack = vi.fn();
    render(<ClaimSummary expenseTitle="Makan Malam Tim" currency="IDR" totalMinor={43_200} items={myItems()} onBack={onBack} />);

    fireEvent.click(screen.getByText(t("claim.summary.backButton")));

    expect(onBack).toHaveBeenCalled();
  });
});
