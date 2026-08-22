import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as splitEngine from "@bagibill/split-engine";
import type { Transfer } from "@bagibill/split-engine";
import { formatMoney, t } from "@/lib/i18n";
import type { BalanceMemberRow } from "./use-group-balance";
import { MAX_NETWORK_MEMBERS, TransferNetwork } from "./TransferNetwork";

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
  makeRow({ memberId: "m1", name: "Nadia", isCurrentMember: true, netMinor: 30_000 }),
  makeRow({ memberId: "m2", name: "Farhan", netMinor: -30_000 }),
];

const DIRECT_TRANSFERS: readonly Transfer[] = [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }];
const SIMPLIFIED_TRANSFERS: readonly Transfer[] = [{ fromIndex: 1, toIndex: 0, amountMinor: 30_000 }];

describe("TransferNetwork", () => {
  it("draws a different shape when the mode switches (edge count changes)", () => {
    const { container, rerender } = render(
      <TransferNetwork
        rows={ROWS}
        transfers={DIRECT_TRANSFERS}
        directTransfers={DIRECT_TRANSFERS}
        mode="direct"
        currency="IDR"
      />,
    );
    const directLineCount = container.querySelectorAll("line").length;

    const threeWayTransfers: readonly Transfer[] = [
      { fromIndex: 1, toIndex: 0, amountMinor: 10_000 },
      { fromIndex: 1, toIndex: 0, amountMinor: 20_000 },
    ];
    rerender(
      <TransferNetwork
        rows={ROWS}
        transfers={threeWayTransfers}
        directTransfers={DIRECT_TRANSFERS}
        mode="simplified"
        currency="IDR"
      />,
    );
    const simplifiedLineCount = container.querySelectorAll("line").length;

    expect(simplifiedLineCount).not.toBe(directLineCount);
  });

  it("never recomputes the group balance when only the display mode changes", () => {
    const calculateSpy = vi.spyOn(splitEngine, "calculateGroupBalances");
    const { rerender } = render(
      <TransferNetwork
        rows={ROWS}
        transfers={DIRECT_TRANSFERS}
        directTransfers={DIRECT_TRANSFERS}
        mode="direct"
        currency="IDR"
      />,
    );
    rerender(
      <TransferNetwork
        rows={ROWS}
        transfers={SIMPLIFIED_TRANSFERS}
        directTransfers={DIRECT_TRANSFERS}
        mode="simplified"
        currency="IDR"
      />,
    );

    expect(calculateSpy).not.toHaveBeenCalled();
    calculateSpy.mockRestore();
  });

  it("marks a simplified transfer as routed (dashed) when no matching direct debt exists", () => {
    const routedTransfer: readonly Transfer[] = [{ fromIndex: 1, toIndex: 0, amountMinor: 5_000 }];
    const { container } = render(
      <TransferNetwork
        rows={ROWS}
        transfers={routedTransfer}
        directTransfers={[]}
        mode="simplified"
        currency="IDR"
      />,
    );
    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke-dasharray")).toBe("1 7");
  });

  it("falls back to a text-only explanation above the network member threshold", () => {
    const manyRows = Array.from({ length: MAX_NETWORK_MEMBERS + 1 }, (_, index) =>
      makeRow({ memberId: `m${index}`, name: `Member ${index}` }),
    );
    const { container } = render(
      <TransferNetwork rows={manyRows} transfers={[]} directTransfers={[]} mode="simplified" currency="IDR" />,
    );

    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(
      screen.getByText(t("group.balance.networkTooLarge", { count: manyRows.length, max: MAX_NETWORK_MEMBERS })),
    ).toBeInTheDocument();
  });

  it("provides a screen-reader text equivalent for the diagram", () => {
    render(
      <TransferNetwork
        rows={ROWS}
        transfers={DIRECT_TRANSFERS}
        directTransfers={DIRECT_TRANSFERS}
        mode="direct"
        currency="IDR"
      />,
    );
    expect(screen.getByRole("img", { name: t("group.balance.networkAriaLabel") })).toBeInTheDocument();
    // getByText normalizes the DOM's non-breaking space (from formatMoney)
    // into a regular one before matching, so the expected string has to go
    // through the same normalization to compare equal.
    const expectedSentence = t("group.balance.transferSentence", {
      from: "Farhan",
      to: "Nadia",
      amount: formatMoney(30_000, "IDR"),
    }).replace(/\u00a0/g, " ");
    expect(screen.getByText(expectedSentence)).toBeInTheDocument();
  });
});
