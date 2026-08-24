import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { IdentityPicker } from "./IdentityPicker";
import type { ClaimParticipant } from "./use-claim";

function participants(): ClaimParticipant[] {
  return [
    { memberId: "m1", name: "Bagus Santoso", color: "--m-1" },
    { memberId: "m2", name: "Dimas Prasetyo", color: "--m-2" },
    { memberId: "m3", name: "Dina Kartika", color: "--m-3" },
  ];
}

function renderPicker(overrides: Partial<ComponentProps<typeof IdentityPicker>> = {}) {
  return render(
    <IdentityPicker
      expenseTitle="Makan Malam Tim"
      creatorName="Bagus Santoso"
      participants={participants()}
      error={false}
      onPick={vi.fn()}
      onAddNew={vi.fn()}
      {...overrides}
    />,
  );
}

describe("IdentityPicker", () => {
  it("shows every participant's name next to their avatar", () => {
    renderPicker();

    for (const participant of participants()) {
      const row = screen.getByText(participant.name).closest("button");
      expect(row).not.toBeNull();
      expect(row?.querySelector('[role="img"]')).toHaveAttribute("aria-label", participant.name);
    }
  });

  it("credits the creator who invited by name in the body copy", () => {
    renderPicker({ creatorName: "Bagus Santoso" });
    expect(screen.getByText(t("claim.identity.body", { creatorName: "Bagus Santoso" }))).toBeInTheDocument();
  });

  it("flags first-initial collisions (Dimas/Dina) but not the unique name (Bagus)", () => {
    renderPicker();

    expect(screen.getByText(t("claim.identity.ambiguousHint", { letters: "D" }))).toBeInTheDocument();
    const bagusRow = screen.getByText("Bagus Santoso").closest("button");
    expect(bagusRow?.textContent).not.toContain(t("claim.identity.initialBadge", { letter: "B" }));
  });

  it("calls onPick with the tapped participant's id", () => {
    const onPick = vi.fn();
    renderPicker({ onPick });

    fireEvent.click(screen.getByText("Dimas Prasetyo"));

    expect(onPick).toHaveBeenCalledWith("m2");
  });

  it("keeps the continue button disabled until a new name is typed", () => {
    renderPicker();

    expect(screen.getByText(t("claim.identity.pickFirst")).closest("button")).toBeDisabled();

    fireEvent.change(screen.getByLabelText(t("claim.identity.newNameLabel")), { target: { value: "Rina" } });

    expect(screen.getByText(t("claim.identity.continueAs", { name: "Rina" })).closest("button")).toBeEnabled();
  });

  it("submits the trimmed new name", async () => {
    const onAddNew = vi.fn().mockResolvedValue(undefined);
    renderPicker({ onAddNew });

    fireEvent.change(screen.getByLabelText(t("claim.identity.newNameLabel")), { target: { value: "  Rina  " } });
    fireEvent.click(screen.getByText(t("claim.identity.continueAs", { name: "Rina" })));

    await vi.waitFor(() => expect(onAddNew).toHaveBeenCalledWith("Rina"));
  });

  it("shows an inline failure instead of nothing when an identity action fails", () => {
    renderPicker({ error: true });
    expect(screen.getByText(t("common.saveFailed"))).toBeInTheDocument();
  });
});
