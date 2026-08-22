import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import type { BalanceMemberRow } from "./use-group-balance";
import { BalanceList } from "./BalanceList";

function row(overrides: Partial<BalanceMemberRow>): BalanceMemberRow {
  return {
    memberId: "m1",
    name: "Andi",
    color: "--m-1",
    netMinor: 0,
    isCurrentMember: false,
    isInactive: false,
    ...overrides,
  };
}

describe("BalanceList", () => {
  it("reads a creditor's direction from the word, not the color class", () => {
    render(<BalanceList rows={[row({ memberId: "m1", name: "Sarah", netMinor: 50_000 })]} currency="IDR" />);
    expect(screen.getByText(t("group.balance.directionReceive"))).toBeInTheDocument();
  });

  it("reads a debtor's direction from the word, not the color class", () => {
    render(<BalanceList rows={[row({ memberId: "m1", name: "Farhan", netMinor: -30_000 })]} currency="IDR" />);
    expect(screen.getByText(t("group.balance.directionPay"))).toBeInTheDocument();
  });

  it("shows a deactivated member who still carries a balance, with an inactive marker", () => {
    render(
      <BalanceList
        rows={[row({ memberId: "m1", name: "Budi", netMinor: -15_000, isInactive: true })]}
        currency="IDR"
      />,
    );
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText(t("group.balance.inactiveBadge"))).toBeInTheDocument();
  });

  it("hides a deactivated member once their balance settles to zero", () => {
    render(
      <BalanceList rows={[row({ memberId: "m1", name: "Budi", netMinor: 0, isInactive: true })]} currency="IDR" />,
    );
    expect(screen.queryByText("Budi")).not.toBeInTheDocument();
  });

  it("shows a settled member neutrally, as neither creditor nor debtor", () => {
    render(<BalanceList rows={[row({ memberId: "m1", name: "Dewi", netMinor: 0 })]} currency="IDR" />);
    expect(screen.getByText(t("group.balance.directionSettled"))).toBeInTheDocument();
  });

  it("keeps the list order the same whether or not a row is highlighted", () => {
    const rows = [row({ memberId: "m1", name: "Andi" }), row({ memberId: "m2", name: "Rina" })];
    const { rerender } = render(<BalanceList rows={rows} currency="IDR" />);
    const orderBefore = screen.getAllByText(/^(Andi|Rina)$/).map((el) => el.textContent);

    rerender(<BalanceList rows={rows} currency="IDR" highlightedMemberId="m2" />);
    const orderAfter = screen.getAllByText(/^(Andi|Rina)$/).map((el) => el.textContent);

    expect(orderBefore).toEqual(["Andi", "Rina"]);
    expect(orderAfter).toEqual(["Andi", "Rina"]);
  });
});
