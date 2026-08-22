import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Transfer } from "@bagibill/split-engine";
import { formatMoney, t } from "@/lib/i18n";
import type { BalanceMemberRow } from "./use-group-balance";
import { SuggestedTransfers } from "./SuggestedTransfers";

function makeRow(overrides: Partial<BalanceMemberRow>): BalanceMemberRow {
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

const ROWS: BalanceMemberRow[] = [
  makeRow({ memberId: "m1", name: "Nadia", isCurrentMember: true }),
  makeRow({ memberId: "m2", name: "Farhan" }),
  makeRow({ memberId: "m3", name: "Dewi" }),
];

describe("SuggestedTransfers", () => {
  it("lists who sends how much to whom", () => {
    const transfers: readonly Transfer[] = [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }];
    render(
      <SuggestedTransfers rows={ROWS} transfers={transfers} directTransfers={transfers} mode="direct" currency="IDR" />,
    );
    expect(screen.getByText("Farhan")).toBeInTheDocument();
    expect(screen.getByText(t("group.balance.youShort"))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(30_000, "IDR").replace(/\u00a0/g, " "))).toBeInTheDocument();
  });

  it("shows a routed badge for a simplified transfer with no matching direct debt", () => {
    const simplified: readonly Transfer[] = [{ fromIndex: 2, toIndex: 0, amountMinor: 10_000 }];
    render(
      <SuggestedTransfers rows={ROWS} transfers={simplified} directTransfers={[]} mode="simplified" currency="IDR" />,
    );
    expect(screen.getByText(t("group.balance.routedBadge"))).toBeInTheDocument();
  });

  it("does not show a routed badge in direct mode, since direct transfers are always the real pair", () => {
    const direct: readonly Transfer[] = [{ fromIndex: 2, toIndex: 0, amountMinor: 10_000 }];
    render(<SuggestedTransfers rows={ROWS} transfers={direct} directTransfers={direct} mode="direct" currency="IDR" />);
    expect(screen.queryByText(t("group.balance.routedBadge"))).not.toBeInTheDocument();
  });

  it("renders nothing when there is nothing to suggest", () => {
    const { container } = render(
      <SuggestedTransfers rows={ROWS} transfers={[]} directTransfers={[]} mode="simplified" currency="IDR" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
