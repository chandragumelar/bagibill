import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { setLocale } from "@/lib/i18n";
import { createFixedClock } from "@/lib/storage/clock";
import { DatePill } from "./DatePill";
import styles from "./DatePill.module.css";

setLocale("id");

const datePillStyles = readFileSync(resolve(process.cwd(), "src/features/expense/DatePill.module.css"), "utf8");
const designTokens = readFileSync(resolve(process.cwd(), "packages/tokens/tokens.css"), "utf8");
const datePillClass = styles.datePill ?? "datePill";

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
    expect(screen.getByLabelText("Pilih tanggal pengeluaran, saat ini Hari ini")).toHaveValue("2026-09-16");
  });

  it("shows a past date and accessible name in the active locale", () => {
    setLocale("en");
    render(<DatePill dateMs={new Date(2026, 8, 10).getTime()} nowMs={NOW_MS} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Choose expense date, currently Sep 10")).toHaveValue("2026-09-10");
  });

  it("uses one directly tappable native date control with its active date name", () => {
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    const input = dateInput(container);
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(1);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(input).toHaveAttribute("aria-label", "Pilih tanggal pengeluaran, saat ini Hari ini");
    expect(input).not.toHaveAttribute("aria-hidden");
    expect(input).not.toHaveAttribute("tabindex", "-1");
    expect(input.parentElement).toHaveClass(datePillClass);
  });

  it("connects native input focus to the pill focus ring", () => {
    const { container } = render(<DatePill dateMs={NOW_MS} nowMs={NOW_MS} onChange={vi.fn()} />);
    const input = dateInput(container);
    input.focus();
    expect(input).toHaveFocus();
    expect(input.parentElement).toHaveClass(datePillClass);
    expect(datePillStyles).toMatch(/\.datePill:focus-within\s*\{[^}]*box-shadow:\s*var\(--focus-ring\)/s);
  });

  it("keeps native date input at mobile auto-zoom minimum", () => {
    expect(datePillStyles).toMatch(/\.hiddenInput\s*\{[^}]*font-size:\s*var\(--fs-body\)/s);
    const bodySizeMatch = designTokens.match(/--fs-body:\s*([\d.]+)px/);
    expect(bodySizeMatch).not.toBeNull();
    expect(Number(bodySizeMatch?.[1])).toBeGreaterThanOrEqual(16);
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
