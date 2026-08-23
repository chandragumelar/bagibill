import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

function noop() {
  return vi.fn();
}

describe("SuggestedTransfers", () => {
  it("lists who sends how much to whom", () => {
    const transfers: readonly Transfer[] = [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }];
    render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={transfers}
        directTransfers={transfers}
        mode="direct"
        currency="IDR"
        onSettle={noop()}
        onSendInfo={noop()}
        onRemind={noop()}
      />,
    );
    expect(screen.getByText("Farhan")).toBeInTheDocument();
    expect(screen.getByText(t("group.balance.youShort"))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(30_000, "IDR").replace(/\u00a0/g, " "))).toBeInTheDocument();
  });

  it("shows a routed badge for a simplified transfer with no matching direct debt", () => {
    const simplified: readonly Transfer[] = [{ fromIndex: 2, toIndex: 0, amountMinor: 10_000 }];
    render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={simplified}
        directTransfers={[]}
        mode="simplified"
        currency="IDR"
        onSettle={noop()}
        onSendInfo={noop()}
        onRemind={noop()}
      />,
    );
    expect(screen.getByText(t("group.balance.routedBadge"))).toBeInTheDocument();
  });

  it("does not show a routed badge in direct mode, since direct transfers are always the real pair", () => {
    const direct: readonly Transfer[] = [{ fromIndex: 2, toIndex: 0, amountMinor: 10_000 }];
    render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={direct}
        directTransfers={direct}
        mode="direct"
        currency="IDR"
        onSettle={noop()}
        onSendInfo={noop()}
        onRemind={noop()}
      />,
    );
    expect(screen.queryByText(t("group.balance.routedBadge"))).not.toBeInTheDocument();
  });

  it("renders nothing when there is nothing to suggest", () => {
    const { container } = render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={[]}
        directTransfers={[]}
        mode="simplified"
        currency="IDR"
        onSettle={noop()}
        onSendInfo={noop()}
        onRemind={noop()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers mark-settled and remind when the current member is owed money", () => {
    const transfers: readonly Transfer[] = [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }];
    const onSettle = vi.fn();
    const onRemind = vi.fn();
    render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={transfers}
        directTransfers={transfers}
        mode="direct"
        currency="IDR"
        onSettle={onSettle}
        onSendInfo={noop()}
        onRemind={onRemind}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: t("settle.action.markSettled") }));
    expect(onSettle).toHaveBeenCalledWith(transfers[0]);

    fireEvent.click(screen.getByRole("button", { name: t("settle.action.remind") }));
    expect(onRemind).toHaveBeenCalledWith("m2");
  });

  it("offers send-info when the current member owes money", () => {
    const transfers: readonly Transfer[] = [{ fromIndex: 0, toIndex: 1, amountMinor: 30_000 }];
    const onSendInfo = vi.fn();
    render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={transfers}
        directTransfers={transfers}
        mode="direct"
        currency="IDR"
        onSettle={noop()}
        onSendInfo={onSendInfo}
        onRemind={noop()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: t("settle.action.sendInfo") }));
    expect(onSendInfo).toHaveBeenCalledWith("m2");
  });

  it("offers only mark-settled when neither party is the current member", () => {
    const transfers: readonly Transfer[] = [{ fromIndex: 1, toIndex: 2, amountMinor: 30_000 }];
    const onSettle = vi.fn();
    render(
      <SuggestedTransfers
        rows={ROWS}
        transfers={transfers}
        directTransfers={transfers}
        mode="direct"
        currency="IDR"
        onSettle={onSettle}
        onSendInfo={noop()}
        onRemind={noop()}
      />,
    );

    expect(screen.queryByRole("button", { name: t("settle.action.remind") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("settle.action.sendInfo") })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t("settle.action.markSettled") }));
    expect(onSettle).toHaveBeenCalledWith(transfers[0]);
  });
});
