import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { setLocale } from "@/lib/i18n";
import { DatePill } from "./DatePill";

setLocale("id");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = new Date(2026, 8, 16).getTime();

function dateInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="date"]');
  if (input === null) throw new Error("date input not found");
  return input as HTMLInputElement;
}

describe("DatePill", () => {
  it('shows "Hari ini" when the draft date is today', () => {
    render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Hari ini" })).toBeInTheDocument();
  });

  it("shows a locale date when the draft date is not today", () => {
    render(<DatePill dateMs={NOW_MS - DAY_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "15 Sep" })).toBeInTheDocument();
  });

  it("calls onChange with the picked date", () => {
    const onChange = vi.fn();
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={onChange} />);
    fireEvent.change(dateInput(container), { target: { value: "2026-09-10" } });
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 8, 10).getTime());
  });

  // spec.md: no future expense dates — a value that slips past the native
  // picker's own `max` (some browsers still allow a typed one) is clamped
  // here too, not accepted as-is.
  it("clamps a picked date past now down to now", () => {
    const onChange = vi.fn();
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={onChange} />);
    fireEvent.change(dateInput(container), { target: { value: "2026-09-20" } });
    expect(onChange).toHaveBeenCalledWith(NOW_MS);
  });

  it("sets the native picker's max to today, so it can't offer a future date", () => {
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    expect(dateInput(container)).toHaveAttribute("max", "2026-09-16");
  });
});
