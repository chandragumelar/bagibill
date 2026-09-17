import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { TreatEditor } from "./TreatEditor";
import type { ExpenseDraftMember, TreatDraft } from "./expense-draft";

const MEMBERS: readonly ExpenseDraftMember[] = [
  { memberId: "m1", name: "Andi", color: "--m-1", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
  { memberId: "m2", name: "Rina", color: "--m-2", checked: true, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
  { memberId: "m3", name: "Budi", color: "--m-3", checked: false, weight: 1, amountMinor: 0, percent: 0, adjustmentMinor: 0 },
];

const CHECKED_MEMBERS = MEMBERS.filter((member) => member.checked);

function treat(overrides: Partial<TreatDraft> = {}): TreatDraft {
  return {
    id: "t1",
    kind: "person",
    sponsorMemberId: "m1",
    beneficiaryMemberId: "m2",
    partialAmountMinor: 0,
    ...overrides,
  };
}

function ControlledTreatEditor({
  initialTreats,
  members = CHECKED_MEMBERS,
}: {
  readonly initialTreats: readonly TreatDraft[];
  readonly members?: readonly ExpenseDraftMember[];
}) {
  const [treats, setTreats] = useState(initialTreats);
  return (
    <TreatEditor
      treats={treats}
      checkedMembers={members}
      currency="IDR"
      onAdd={() =>
        setTreats((current) => [
          ...current,
          { id: `t${current.length + 1}`, kind: "person", sponsorMemberId: "m1", beneficiaryMemberId: "m2", partialAmountMinor: 0 },
        ])
      }
      onUpdate={(id, patch) => setTreats((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))}
      onRemove={(id) => setTreats((current) => current.filter((row) => row.id !== id))}
    />
  );
}

describe("TreatEditor", () => {
  it("adds and removes a treat", () => {
    render(<ControlledTreatEditor initialTreats={[]} />);
    fireEvent.click(screen.getByText(t("expense.treat.add")));
    expect(screen.getByLabelText(t("expense.treat.remove"))).toBeInTheDocument();

    expect(screen.getByText(t("expense.treat.addAnother"))).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(t("expense.treat.remove")));
    expect(screen.queryByLabelText(t("expense.treat.remove"))).not.toBeInTheDocument();
  });

  it("adds a second atomic treat without changing the first treat", () => {
    render(<ControlledTreatEditor initialTreats={[]} members={MEMBERS} />);
    fireEvent.click(screen.getByText(t("expense.treat.add")));
    fireEvent.click(screen.getByText(t("expense.treat.addAnother")));

    const beneficiarySelects = screen.getAllByLabelText(t("expense.treat.beneficiaryLabel"));
    fireEvent.change(beneficiarySelects[1] as HTMLSelectElement, { target: { value: "m3" } });

    expect(screen.getAllByLabelText(t("expense.treat.remove"))).toHaveLength(2);
    expect(screen.getAllByLabelText(t("expense.treat.sponsorLabel"))).toHaveLength(2);
    expect(screen.getAllByLabelText(t("expense.treat.beneficiaryLabel"))).toHaveLength(2);
    expect((beneficiarySelects[0] as HTMLSelectElement).value).toBe("m2");
    expect((beneficiarySelects[1] as HTMLSelectElement).value).toBe("m3");
  });

  it("only offers checked members as sponsor/beneficiary options", () => {
    render(<ControlledTreatEditor initialTreats={[treat()]} />);
    const sponsorSelect = screen.getByLabelText(t("expense.treat.sponsorLabel"));
    const optionNames = within(sponsorSelect).getAllByRole("option").map((option) => option.textContent);
    expect(optionNames).not.toContain("Budi");
  });

  it("never lets the beneficiary select the same person as the sponsor", () => {
    render(<ControlledTreatEditor initialTreats={[treat({ sponsorMemberId: "m1", beneficiaryMemberId: "m2" })]} />);
    const beneficiarySelect = screen.getByLabelText(t("expense.treat.beneficiaryLabel"));
    const optionNames = within(beneficiarySelect).getAllByRole("option").map((option) => option.textContent);
    expect(optionNames).not.toContain("Andi");
  });

  it("shows a money input for the partial amount only in partial mode", () => {
    render(<ControlledTreatEditor initialTreats={[treat({ kind: "person" })]} />);
    expect(screen.queryByLabelText(t("expense.treat.partialAmountLabel"))).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(t("expense.treat.kindPartial")));
    expect(screen.getByLabelText(t("expense.treat.partialAmountLabel"))).toBeInTheDocument();
  });

  it("disables adding a treat when fewer than two members are checked", () => {
    render(
      <TreatEditor
        treats={[]}
        checkedMembers={[MEMBERS[0] as ExpenseDraftMember]}
        currency="IDR"
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText(t("expense.treat.add"))).toBeDisabled();
    expect(screen.getByText(t("expense.treat.needTwoMembers"))).toBeInTheDocument();
  });
});
