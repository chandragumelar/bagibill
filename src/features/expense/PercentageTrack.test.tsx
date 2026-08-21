import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { PercentageTrack, computeSpreadRemainingPercent } from "./PercentageTrack";

describe("computeSpreadRemainingPercent", () => {
  it("splits the remaining percent evenly across targets, two decimals, leftover to the first", () => {
    const updates = computeSpreadRemainingPercent(
      [
        { memberId: "m1", percent: 0 },
        { memberId: "m2", percent: 0 },
        { memberId: "m3", percent: 0 },
      ],
      100,
    );
    expect(updates).toEqual([
      { memberId: "m1", percent: 33.34 },
      { memberId: "m2", percent: 33.33 },
      { memberId: "m3", percent: 33.33 },
    ]);
    expect(updates.reduce((sum, u) => sum + u.percent, 0)).toBeCloseTo(100, 5);
  });

  it("returns nothing when there is no remaining percent to spread", () => {
    expect(computeSpreadRemainingPercent([{ memberId: "m1", percent: 0 }], 0)).toEqual([]);
    expect(computeSpreadRemainingPercent([{ memberId: "m1", percent: 0 }], -5)).toEqual([]);
  });
});

describe("PercentageTrack", () => {
  it("mockup state: di bawah seratus — under, readbox shows the shortfall", () => {
    render(
      <PercentageTrack
        members={[
          { memberId: "m1", color: "--m-1", percent: 30 },
          { memberId: "m2", color: "--m-2", percent: 0 },
        ]}
        onSpreadRemaining={vi.fn()}
      />,
    );
    expect(screen.getByText(t("expense.percentage.under", { diff: 70, sum: 30 }))).toBeInTheDocument();
  });

  it("mockup state: pas — exact at 100%", () => {
    render(
      <PercentageTrack
        members={[
          { memberId: "m1", color: "--m-1", percent: 50 },
          { memberId: "m2", color: "--m-2", percent: 50 },
        ]}
        onSpreadRemaining={vi.fn()}
      />,
    );
    expect(screen.getByText(t("expense.percentage.exact"))).toBeInTheDocument();
  });

  it("mockup state: di atas — over, readbox shows the excess and the spread button is disabled", () => {
    render(
      <PercentageTrack
        members={[
          { memberId: "m1", color: "--m-1", percent: 70 },
          { memberId: "m2", color: "--m-2", percent: 50 },
        ]}
        onSpreadRemaining={vi.fn()}
      />,
    );
    expect(screen.getByText(t("expense.percentage.over", { diff: 20, sum: 120 }))).toBeInTheDocument();
    expect(screen.getByText(t("expense.percentage.spreadRemaining"))).toBeDisabled();
  });

  it("ratakan sisa spreads the shortfall to members still at zero", () => {
    const onSpreadRemaining = vi.fn();
    render(
      <PercentageTrack
        members={[
          { memberId: "m1", color: "--m-1", percent: 40 },
          { memberId: "m2", color: "--m-2", percent: 0 },
          { memberId: "m3", color: "--m-3", percent: 0 },
        ]}
        onSpreadRemaining={onSpreadRemaining}
      />,
    );
    fireEvent.click(screen.getByText(t("expense.percentage.spreadRemaining")));
    expect(onSpreadRemaining).toHaveBeenCalledWith([
      { memberId: "m2", percent: 30 },
      { memberId: "m3", percent: 30 },
    ]);
  });

  it("ratakan sisa spreads to everyone when nobody is at zero", () => {
    const onSpreadRemaining = vi.fn();
    render(
      <PercentageTrack
        members={[
          { memberId: "m1", color: "--m-1", percent: 20 },
          { memberId: "m2", color: "--m-2", percent: 20 },
        ]}
        onSpreadRemaining={onSpreadRemaining}
      />,
    );
    fireEvent.click(screen.getByText(t("expense.percentage.spreadRemaining")));
    expect(onSpreadRemaining).toHaveBeenCalledWith([
      { memberId: "m1", percent: 30 },
      { memberId: "m2", percent: 30 },
    ]);
  });
});
