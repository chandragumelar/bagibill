import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { ChargeEditor } from "./ChargeEditor";
import type { ChargeDraft, ExpenseDraftMember } from "./expense-draft";

const MEMBERS: readonly ExpenseDraftMember[] = [
  { memberId: "m1", name: "Farhan", color: "--m-1", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
  { memberId: "m2", name: "Sarah", color: "--m-2", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
];

function charge(overrides: Partial<ChargeDraft> = {}): ChargeDraft {
  return {
    id: "c1",
    name: "Service",
    amountKind: "percent",
    rawValue: "10",
    percentBasis: "subtotal",
    allocationMode: "proportional",
    allocationMemberId: "",
    ...overrides,
  };
}

// Wraps ChargeEditor with real state, the same way ExpenseFormRata/Porsi
// drive it through useExpenseDraft, so update/remove round-trip is observed
// through actual re-renders instead of asserted against a mock's call args.
function ControlledChargeEditor({ initialCharges }: { initialCharges: readonly ChargeDraft[] }) {
  const [charges, setCharges] = useState(initialCharges);
  return (
    <ChargeEditor
      charges={charges}
      checkedMembers={MEMBERS}
      onAdd={() =>
        setCharges((current) => [
          ...current,
          { id: `c${current.length + 1}`, name: "", amountKind: "percent", rawValue: "", percentBasis: "subtotal", allocationMode: "proportional", allocationMemberId: "" },
        ])
      }
      onLoadPreset={() => {}}
      onUpdate={(id, patch) => setCharges((current) => current.map((c) => (c.id === id ? { ...c, ...patch } : c)))}
      onRemove={(id) => setCharges((current) => current.filter((c) => c.id !== id))}
    />
  );
}

describe("ChargeEditor", () => {
  it("adds a new empty row and removes it", () => {
    render(<ControlledChargeEditor initialCharges={[]} />);
    fireEvent.click(screen.getByText(t("expense.charge.add")));
    expect(screen.getByLabelText(t("expense.charge.remove", { name: t("expense.charge.unnamed", { index: 1 }) }))).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(t("expense.charge.remove", { name: t("expense.charge.unnamed", { index: 1 }) })));
    expect(screen.queryByText(t("expense.charge.kindPercent"))).not.toBeInTheDocument();
  });

  it("calls onLoadPreset when the preset button is tapped", () => {
    const onLoadPreset = vi.fn();
    render(
      <ChargeEditor
        charges={[]}
        checkedMembers={MEMBERS}
        onAdd={() => {}}
        onLoadPreset={onLoadPreset}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    fireEvent.click(screen.getByText(t("expense.charge.loadPreset")));
    expect(onLoadPreset).toHaveBeenCalledOnce();
  });

  it("toggling percent<->nominal clears the typed value instead of translating it", () => {
    render(<ControlledChargeEditor initialCharges={[charge({ amountKind: "percent", rawValue: "10" })]} />);
    const valueInput = screen.getByLabelText(t("expense.charge.valueLabelPercent", { name: "Service" }));
    expect(valueInput).toHaveValue("10");

    fireEvent.click(screen.getByText(t("expense.charge.kindFixed")));

    const fixedInput = screen.getByLabelText(t("expense.charge.valueLabelFixed", { name: "Service" }));
    expect(fixedInput).toHaveValue("");
  });

  it("accepts a leading minus sign for a discount", () => {
    render(<ControlledChargeEditor initialCharges={[charge({ amountKind: "fixed", rawValue: "" })]} />);
    const valueInput = screen.getByLabelText(t("expense.charge.valueLabelFixed", { name: "Service" }));
    fireEvent.change(valueInput, { target: { value: "-20000" } });
    expect(valueInput).toHaveValue("-20000");
  });

  it("only shows the percent basis picker once there's more than one percent charge", () => {
    const { rerender } = render(
      <ChargeEditor
        charges={[charge({ id: "c1", amountKind: "percent" })]}
        checkedMembers={MEMBERS}
        onAdd={() => {}}
        onLoadPreset={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.queryByText(t("expense.charge.basisSubtotal"))).not.toBeInTheDocument();

    rerender(
      <ChargeEditor
        charges={[charge({ id: "c1", amountKind: "percent" }), charge({ id: "c2", amountKind: "percent" })]}
        checkedMembers={MEMBERS}
        onAdd={() => {}}
        onLoadPreset={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getAllByText(t("expense.charge.basisSubtotal")).length).toBeGreaterThan(0);
  });

  it("gives every control an accessible name that mentions the charge it belongs to", () => {
    render(<ChargeEditor charges={[charge({ name: "Pajak" })]} checkedMembers={MEMBERS} onAdd={() => {}} onLoadPreset={() => {}} onUpdate={() => {}} onRemove={() => {}} />);
    expect(screen.getByLabelText(t("expense.charge.valueLabelPercent", { name: "Pajak" }))).toBeInTheDocument();
    expect(screen.getByLabelText(t("expense.charge.kindGroupLabel", { name: "Pajak" }))).toBeInTheDocument();
    expect(screen.getByLabelText(t("expense.charge.allocationGroupLabel", { name: "Pajak" }))).toBeInTheDocument();
    expect(screen.getByLabelText(t("expense.charge.remove", { name: "Pajak" }))).toBeInTheDocument();
  });
});
