import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatMoney, t } from "@/lib/i18n";
import type { ExpenseItemRecord } from "@/lib/storage/records";
import { ShareConfirmSheet } from "./ShareConfirmSheet";
import type { ClaimParticipant } from "./use-claim";

// Intl inserts a non-breaking space between "IDR" and the number; RTL's
// text normalizer collapses that in the DOM but not in a raw query string.
function money(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency).replace(/\u00a0/g, " ");
}

const ITEM: ExpenseItemRecord = {
  itemId: "i1",
  name: "Ayam Bakar Madu",
  unitPriceMinor: 45_000,
  quantity: 1,
  claims: [{ memberId: "m2", weight: 1 }],
};

const CLAIMANT: ClaimParticipant = { memberId: "m2", name: "Dimas Prasetyo", color: "--m-2" };

describe("ShareConfirmSheet", () => {
  it("shows the item name, total, and the current claimant's name next to their avatar", () => {
    render(<ShareConfirmSheet open item={ITEM} currentClaimant={CLAIMANT} currency="IDR" onConfirm={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Ayam Bakar Madu")).toBeInTheDocument();
    const claimantAvatar = screen.getByText("Dimas Prasetyo").closest("div")?.querySelector('[role="img"]');
    expect(claimantAvatar).toHaveAttribute("aria-label", "Dimas Prasetyo");
  });

  it("shows the split share, half of the item total for an even 45.000 split", () => {
    render(<ShareConfirmSheet open item={ITEM} currentClaimant={CLAIMANT} currency="IDR" onConfirm={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(money(22_500, "IDR"))).toBeInTheDocument();
  });

  it("calls onConfirm when Bagi berdua is tapped", () => {
    const onConfirm = vi.fn();
    render(<ShareConfirmSheet open item={ITEM} currentClaimant={CLAIMANT} currency="IDR" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(t("claim.confirm.shareButton")));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onClose when Batal is tapped, without claiming anything", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<ShareConfirmSheet open item={ITEM} currentClaimant={CLAIMANT} currency="IDR" onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByText(t("claim.confirm.cancelButton")));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("renders nothing interactive when there's no item to confirm", () => {
    render(<ShareConfirmSheet open item={undefined} currentClaimant={undefined} currency="IDR" onConfirm={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByText(t("claim.confirm.shareButton"))).not.toBeInTheDocument();
  });
});
