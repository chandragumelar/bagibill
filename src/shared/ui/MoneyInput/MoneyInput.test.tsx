import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { setLocale } from "@/lib/i18n";
import { MoneyInput, type MoneyInputProps } from "@/shared/ui/MoneyInput/MoneyInput";

const moneyInputStyles = readFileSync(resolve(process.cwd(), "src/shared/ui/MoneyInput/MoneyInput.module.css"), "utf8");
const designTokens = readFileSync(resolve(process.cwd(), "packages/tokens/tokens.css"), "utf8");

// Dipakai buat kasus yang butuh nilai tampil beneran ikut update balik
// (posisi kursor) — MoneyInput sendiri fully controlled, nol state
// internal buat amountMinor.
function ControlledMoneyInput(props: Omit<MoneyInputProps, "onChange" | "amountMinor"> & { initialAmountMinor: number }) {
  const { initialAmountMinor, ...rest } = props;
  const [amountMinor, setAmountMinor] = useState(initialAmountMinor);
  return <MoneyInput {...rest} amountMinor={amountMinor} onChange={setAmountMinor} />;
}

beforeEach(() => {
  setLocale("id");
});

describe("MoneyInput", () => {
  it("keeps nominal input at mobile auto-zoom minimum through shared token", () => {
    expect(moneyInputStyles).toMatch(/\.field\s*\{[^}]*font-size:\s*var\(--fs-body\)/s);

    const bodySizeMatch = designTokens.match(/--fs-body:\s*([\d.]+)px/);
    expect(bodySizeMatch).not.toBeNull();
    expect(Number(bodySizeMatch?.[1])).toBeGreaterThanOrEqual(16);
  });

  it("shows nothing but the placeholder when the amount is zero", () => {
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={0} onChange={vi.fn()} />);
    const input = screen.getByLabelText<HTMLInputElement>("Nominal");
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("0");
  });

  it("renders a filled amount with locale thousand separators", () => {
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={200000} onChange={vi.fn()} />);
    expect(screen.getByLabelText<HTMLInputElement>("Nominal").value).toBe("200.000");
  });

  it("keeps nine digits and grouped separators in the input display", () => {
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={500000000} onChange={vi.fn()} />);
    const input = screen.getByLabelText<HTMLInputElement>("Nominal");
    expect(input.value).toBe("500.000.000");
    expect(input).toHaveAttribute("size", "11");
  });

  it("uses the locale's own separator character — comma under en, not id's dot", () => {
    setLocale("en");
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={200000} onChange={vi.fn()} />);
    expect(screen.getByLabelText<HTMLInputElement>("Nominal").value).toBe("200,000");
  });

  it("emits the typed value as an integer minor unit, never a formatted string", () => {
    const onChange = vi.fn();
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "200000" } });
    expect(onChange).toHaveBeenCalledWith(200000);
  });

  it("strips the separators it just displayed before re-parsing them", () => {
    const onChange = vi.fn();
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "60.000" } });
    expect(onChange).toHaveBeenCalledWith(60000);
  });

  it("clears back to an empty string when every digit is removed", () => {
    const onChange = vi.fn();
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={60000} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("keeps the caret where the digit was typed when editing in the middle of an already-formatted number", () => {
    render(<ControlledMoneyInput label="Nominal" prefix="Rp" initialAmountMinor={200000} />);
    const input = screen.getByLabelText<HTMLInputElement>("Nominal");
    expect(input.value).toBe("200.000");

    // Typing "4" between "200" and ".000" — browser already inserted the
    // digit and moved the caret to index 4 before firing the change event.
    fireEvent.change(input, { target: { value: "2004.000", selectionStart: 4 } });

    expect(input.value).toBe("2.004.000");
    expect(input.selectionStart).toBe(5); // right after the "4" the user typed, before the next separator
  });
});
