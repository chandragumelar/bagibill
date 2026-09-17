import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { setLocale } from "@/lib/i18n";
import { createFixedClock } from "@/lib/storage/clock";
import { DatePill } from "./DatePill";

setLocale("id");

const NOW_MS = new Date(2026, 8, 16, 12).getTime();

function dateInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="date"]');
  if (input === null) throw new Error("date input not found");
  return input as HTMLInputElement;
}

describe("DatePill", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    setLocale("id");
  });

  it('shows "Hari ini" when the draft date is today', () => {
    const nowMs = createFixedClock(NOW_MS).now();
    render(<DatePill dateMs={nowMs} nowMs={nowMs} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Pilih tanggal pengeluaran, saat ini Hari ini" })).toHaveTextContent("Hari ini");
  });

  it("shows a past date and accessible name in the active locale", () => {
    setLocale("en");
    render(<DatePill dateMs={new Date(2026, 8, 10).getTime()} nowMs={NOW_MS} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Choose expense date, currently Sep 10" })).toHaveTextContent("Sep 10");
  });

  it("opens the native picker from a focusable button", () => {
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Pilih tanggal pengeluaran, saat ini Hari ini" });
    const input = dateInput(container);
    const showPicker = vi.fn();
    input.showPicker = showPicker;

    button.focus();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(showPicker).toHaveBeenCalledOnce();
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
  it("clamps the next calendar day at the end-of-day boundary", () => {
    const nowMs = createFixedClock(new Date(2026, 8, 16, 23, 59, 59).getTime()).now();
    const onChange = vi.fn();
    const { container } = render(<DatePill dateMs={nowMs} nowMs={nowMs} onChange={onChange} />);
    fireEvent.change(dateInput(container), { target: { value: "2026-09-17" } });
    expect(onChange).toHaveBeenCalledWith(nowMs);
  });

  it("sets the native picker's max to today, so it can't offer a future date", () => {
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    expect(dateInput(container)).toHaveAttribute("max", "2026-09-16");
  });

  it("uses the device timezone for the maximum calendar date", () => {
    vi.stubEnv("TZ", "Pacific/Kiritimati");
    const nowMs = createFixedClock(Date.UTC(2026, 8, 16, 10, 30)).now();
    const { container } = render(<DatePill dateMs={nowMs} nowMs={nowMs} onChange={vi.fn()} />);
    expect(dateInput(container)).toHaveAttribute("max", "2026-09-17");
  });
});
