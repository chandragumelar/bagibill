import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import type { ExpenseItemRecord } from "@/lib/storage/records";
import { ClaimItemList } from "./ClaimItemList";
import type { ClaimParticipant } from "./use-claim";

function participants(): ClaimParticipant[] {
  return [
    { memberId: "m1", name: "Bagus Santoso", color: "--m-1" },
    { memberId: "m2", name: "Dimas Prasetyo", color: "--m-2" },
  ];
}

function items(): ExpenseItemRecord[] {
  return [
    { itemId: "i1", name: "Sate Ayam", unitPriceMinor: 38_000, quantity: 1, claims: [] },
    { itemId: "i2", name: "Nasi Putih", unitPriceMinor: 6_000, quantity: 4, claims: [{ memberId: "m1", weight: 1 }] },
  ];
}

function renderList(overrides: Partial<ComponentProps<typeof ClaimItemList>> = {}) {
  return render(
    <ClaimItemList
      expenseTitle="Makan Malam Tim"
      creatorName="Bagus Santoso"
      creatorColor="--m-1"
      totalMinor={62_000}
      currency="IDR"
      participants={participants()}
      items={items()}
      currentMemberId="m2"
      myTotalMinor={0}
      myItemCount={0}
      saveError={false}
      onTapItem={vi.fn()}
      onRetrySave={vi.fn()}
      onViewSummary={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ClaimItemList", () => {
  it("shows an honest unclaimed hint for an item nobody has claimed", () => {
    renderList();
    expect(screen.getByText(t("claim.item.unclaimed"), { exact: false })).toBeInTheDocument();
  });

  it("shows the inviting creator's name next to their avatar", () => {
    renderList();
    const inviteSub = screen.getByText(t("claim.list.invitedBy", { creatorName: "Bagus Santoso" }));
    const inviteAvatar = inviteSub.parentElement?.parentElement?.querySelector('[role="img"]');
    expect(inviteAvatar).toHaveAttribute("aria-label", "Bagus Santoso");
  });

  it("shows each claimant's name next to their avatar", () => {
    renderList();
    const claimantAvatar = screen.getByText("Bagus Santoso").parentElement?.querySelector('[role="img"]');
    expect(claimantAvatar).toHaveAttribute("aria-label", "Bagus Santoso");
  });

  it("shows the portion ratio only for items with quantity greater than one", () => {
    renderList();
    expect(screen.getByText(t("claim.item.portionRatio", { claimed: 1, quantity: 4 }), { exact: false })).toBeInTheDocument();
  });

  it("calls onTapItem with the tapped item's id", () => {
    const onTapItem = vi.fn();
    renderList({ onTapItem });

    fireEvent.click(screen.getByText("Sate Ayam"));

    expect(onTapItem).toHaveBeenCalledWith("i1");
  });

  it("shows a save failure inline and retries on tap, without touching the console", () => {
    const onRetrySave = vi.fn();
    renderList({ saveError: true, onRetrySave });

    expect(screen.getByText(t("common.saveFailed"))).toBeInTheDocument();
    fireEvent.click(screen.getByText(t("system.retry")));

    expect(onRetrySave).toHaveBeenCalled();
  });

  it("opens the summary when the sticky total bar is tapped", () => {
    const onViewSummary = vi.fn();
    renderList({ onViewSummary, myTotalMinor: 42_000, myItemCount: 2 });

    fireEvent.click(screen.getByText(t("claim.list.itemCount", { count: 2 })));

    expect(onViewSummary).toHaveBeenCalled();
  });
});
