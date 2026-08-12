import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TabBar } from "@/app/layout/TabBar/TabBar";

const tabs = [
  { id: "tx", label: "Transaksi" },
  { id: "balance", label: "Saldo" },
  { id: "summary", label: "Ringkasan", disabled: true },
];

describe("TabBar", () => {
  it("marks the active tab with aria-current", () => {
    render(<TabBar tabs={tabs} activeId="tx" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Transaksi" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Saldo" })).not.toHaveAttribute("aria-current");
  });

  it("fires onSelect with the tab id when an enabled tab is pressed", () => {
    const onSelect = vi.fn();
    render(<TabBar tabs={tabs} activeId="tx" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Saldo" }));
    expect(onSelect).toHaveBeenCalledWith("balance");
  });

  it("marks a disabled tab aria-disabled and does not fire onSelect", () => {
    const onSelect = vi.fn();
    render(<TabBar tabs={tabs} activeId="tx" onSelect={onSelect} />);
    const ringkasan = screen.getByRole("button", { name: "Ringkasan" });
    expect(ringkasan).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(ringkasan);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
