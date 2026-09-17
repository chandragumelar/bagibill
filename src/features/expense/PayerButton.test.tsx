import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PayerButton } from "./PayerButton";
import type { ExpenseDraftMember } from "./expense-draft";

function member(overrides: Partial<ExpenseDraftMember> & Pick<ExpenseDraftMember, "memberId" | "name">): ExpenseDraftMember {
  return { color: "--m-1", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0, ...overrides };
}

const MEMBERS: readonly ExpenseDraftMember[] = [
  member({ memberId: "m1", name: "Farhan" }),
  member({ memberId: "m2", name: "Sarah", checked: false }),
  member({ memberId: "m3", name: "Andi" }),
];

describe("PayerButton", () => {
  it("shows the current payer's name on the closed button", () => {
    render(<PayerButton members={MEMBERS} payerMemberId="m1" currency="IDR" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Farhan/ })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // spec.md 6.7: whoever fronts the bill doesn't have to eat — the picker
  // must list every active member, unchecked ones included.
  it("lists every active member in the picker, including one not checked as a participant", () => {
    render(<PayerButton members={MEMBERS} payerMemberId="m1" currency="IDR" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Farhan/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Farhan");
    expect(dialog).toHaveTextContent("Sarah");
    expect(dialog).toHaveTextContent("Andi");
  });

  it("selecting a member calls onSelect with their memberId and closes the sheet", () => {
    const onSelect = vi.fn();
    render(<PayerButton members={MEMBERS} payerMemberId="m1" currency="IDR" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Farhan/ }));
    fireEvent.click(screen.getByText("Sarah"));
    expect(onSelect).toHaveBeenCalledWith("m2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
