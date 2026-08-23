import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { SettlementHistory, type SettlementHistoryEntry } from "./SettlementHistory";

const ENTRIES: SettlementHistoryEntry[] = [
  {
    settlementId: "s1",
    fromName: "Farhan",
    fromColor: "--m-2",
    toName: "Nadia",
    toColor: "--m-1",
    amountMinor: 400_000,
    date: 1_700_000_000_000,
    note: "sebagian",
  },
  {
    settlementId: "s2",
    fromName: "Dewi",
    fromColor: "--m-3",
    toName: "Sarah",
    toColor: "--m-4",
    amountMinor: 300_000,
    date: 1_699_900_000_000,
  },
];

describe("SettlementHistory", () => {
  it("lists every visible entry with sender, recipient, and amount", () => {
    render(<SettlementHistory entries={ENTRIES} currency="IDR" onUndo={vi.fn()} />);
    expect(screen.getAllByText("Farhan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nadia").length).toBeGreaterThan(0);
    expect(screen.getByText((text) => text.includes("400") && text.includes("000"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("300") && text.includes("000"))).toBeInTheDocument();
  });

  it("calls onUndo with the settlement id when its undo button is tapped", () => {
    const onUndo = vi.fn();
    render(<SettlementHistory entries={ENTRIES} currency="IDR" onUndo={onUndo} />);

    const firstButton = screen.getAllByRole("button", { name: t("settle.history.deleteButton") })[0];
    if (firstButton === undefined) throw new Error("expected at least one delete button");
    fireEvent.click(firstButton);

    expect(onUndo).toHaveBeenCalledWith("s1");
  });

  it("shows an honest empty state when there's nothing to list", () => {
    render(<SettlementHistory entries={[]} currency="IDR" onUndo={vi.fn()} />);
    expect(screen.getByText(t("settle.history.emptyBody"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("settle.history.deleteButton") })).not.toBeInTheDocument();
  });

  it("never lists an undone (soft-deleted) entry — the caller filters before passing entries", () => {
    const secondEntry = ENTRIES[1];
    if (secondEntry === undefined) throw new Error("expected a second fixture entry");
    render(<SettlementHistory entries={[secondEntry]} currency="IDR" onUndo={vi.fn()} />);
    expect(screen.queryAllByText("Farhan")).toHaveLength(0);
  });
});
