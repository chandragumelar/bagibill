import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { WeightStepper } from "./WeightStepper";

const MEMBER_NAME = "Sarah";

function decreaseButton() {
  return screen.getByLabelText(t("expense.weight.decrease", { name: MEMBER_NAME }));
}

function increaseButton() {
  return screen.getByLabelText(t("expense.weight.increase", { name: MEMBER_NAME }));
}

function valueInput() {
  return screen.getByLabelText(t("expense.weight.inputLabel", { name: MEMBER_NAME }));
}

// Wraps WeightStepper with real state so typing/blur/preset behavior can be
// observed round-trip, the same way the parent draft would drive it.
function ControlledWeightStepper({ initialWeight }: { initialWeight: number }) {
  const [weight, setWeight] = useState(initialWeight);
  return <WeightStepper memberName={MEMBER_NAME} weight={weight} onChange={setWeight} />;
}

describe("WeightStepper", () => {
  it("increases and decreases the weight by one step", () => {
    const onChange = vi.fn();
    render(<WeightStepper memberName={MEMBER_NAME} weight={2} onChange={onChange} />);

    fireEvent.click(increaseButton());
    expect(onChange).toHaveBeenLastCalledWith(3);

    fireEvent.click(decreaseButton());
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("disables the minus button at weight zero", () => {
    render(<WeightStepper memberName={MEMBER_NAME} weight={0} onChange={vi.fn()} />);
    expect(decreaseButton()).toBeDisabled();
  });

  it("sets the half, third, and quarter presets", () => {
    const onChange = vi.fn();
    render(<WeightStepper memberName={MEMBER_NAME} weight={1} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(t("expense.weight.presetHalfAria", { name: MEMBER_NAME })));
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    fireEvent.click(screen.getByLabelText(t("expense.weight.presetThirdAria", { name: MEMBER_NAME })));
    expect(onChange).toHaveBeenLastCalledWith(0.33);

    fireEvent.click(screen.getByLabelText(t("expense.weight.presetQuarterAria", { name: MEMBER_NAME })));
    expect(onChange).toHaveBeenLastCalledWith(0.25);
  });

  it("accepts a manually typed weight", () => {
    render(<ControlledWeightStepper initialWeight={1} />);
    fireEvent.change(valueInput(), { target: { value: "4" } });
    expect(valueInput()).toHaveValue("4");
  });

  it("truncates more than two decimal places at blur, not while typing", () => {
    render(<ControlledWeightStepper initialWeight={1} />);
    fireEvent.change(valueInput(), { target: { value: "1.5678" } });
    expect(valueInput()).toHaveValue("1.5678");

    fireEvent.blur(valueInput());
    expect(valueInput()).toHaveValue("1.56");
  });

  it("gives every control an accessible name that names the member", () => {
    render(<WeightStepper memberName={MEMBER_NAME} weight={1} onChange={vi.fn()} />);
    expect(decreaseButton()).toBeInTheDocument();
    expect(increaseButton()).toBeInTheDocument();
    expect(valueInput()).toBeInTheDocument();
    expect(screen.getByLabelText(t("expense.weight.presetHalfAria", { name: MEMBER_NAME }))).toBeInTheDocument();
    expect(screen.getByLabelText(t("expense.weight.presetThirdAria", { name: MEMBER_NAME }))).toBeInTheDocument();
    expect(screen.getByLabelText(t("expense.weight.presetQuarterAria", { name: MEMBER_NAME }))).toBeInTheDocument();
  });
});
