import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { setLocale } from "@/lib/i18n";
import { CategoryPill } from "./CategoryPill";

setLocale("id");

describe("CategoryPill", () => {
  it("shows the current category's label on the closed button", () => {
    render(<CategoryPill category="fun" templateCategories={["food"]} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Hiburan" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Every one of the 8 keys stays pickable, not just the group's template
  // ones — a template seeds a starting point, it's not a fence.
  it("lists all eight categories, not just the template's own", () => {
    render(<CategoryPill category="food" templateCategories={["food"]} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Makanan" }));
    const dialog = screen.getByRole("dialog");
    for (const label of ["Makanan", "Transportasi", "Penginapan", "Belanja", "Hiburan", "Tagihan", "Kesehatan", "Lainnya"]) {
      expect(dialog).toHaveTextContent(label);
    }
  });

  // The template's own categories are pinned to the top, in its own order —
  // this drives the picker's list order, not a filter.
  it("orders the template's own categories first, in the template's order", () => {
    render(<CategoryPill category="food" templateCategories={["bills", "shopping"]} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Makanan" }));
    const dialog = screen.getByRole("dialog");
    const labels = within(dialog).getAllByRole("button").map((button) => button.textContent);
    expect(labels.slice(0, 2)).toEqual(["Tagihan", "Belanja"]);
  });

  it("selecting a category calls onSelect and closes the sheet", () => {
    const onSelect = vi.fn();
    render(<CategoryPill category="food" templateCategories={["food"]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Makanan" }));
    fireEvent.click(screen.getByText("Hiburan"));
    expect(onSelect).toHaveBeenCalledWith("fun");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
