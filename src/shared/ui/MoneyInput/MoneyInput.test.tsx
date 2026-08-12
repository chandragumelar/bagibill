import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MoneyInput } from "@/shared/ui/MoneyInput/MoneyInput";

describe("MoneyInput", () => {
  it("shows nothing but the placeholder when the amount is zero", () => {
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={0} onChange={vi.fn()} />);
    const input = screen.getByLabelText<HTMLInputElement>("Nominal");
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("0");
  });

  it("renders a filled amount as a plain digit string", () => {
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={60000} onChange={vi.fn()} />);
    expect(screen.getByLabelText<HTMLInputElement>("Nominal").value).toBe("60000");
  });

  it("emits the typed value as an integer minor unit, never a string", () => {
    const onChange = vi.fn();
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "60000" } });
    expect(onChange).toHaveBeenCalledWith(60000);
  });

  it("strips non-digit characters before parsing", () => {
    const onChange = vi.fn();
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "60.000" } });
    expect(onChange).toHaveBeenCalledWith(60000);
  });

  it("clears back to zero when every digit is removed", () => {
    const onChange = vi.fn();
    render(<MoneyInput label="Nominal" prefix="Rp" amountMinor={60000} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
