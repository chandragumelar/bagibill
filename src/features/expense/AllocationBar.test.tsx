import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SplitWarning } from "@bagibill/split-engine";
import { t, formatMoney } from "@/lib/i18n";
import { AllocationBar, resolveAllocationState } from "./AllocationBar";

// RTL's default text matcher normalizes DOM whitespace (including the
// non-breaking space Intl puts between currency and amount) down to a plain
// space before comparing — so the expected string needs the same treatment.
function withoutNbsp(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

const MEMBERS = [
  { memberId: "m1", color: "--m-1", shareMinor: 0 },
  { memberId: "m2", color: "--m-2", shareMinor: 0 },
];

describe("resolveAllocationState", () => {
  it("reads under_allocated straight from the warning, not from the members", () => {
    const warnings: readonly SplitWarning[] = [{ code: "under_allocated", remainingMinor: 2_000 }];
    expect(resolveAllocationState(warnings)).toEqual({ kind: "under", remainingMinor: 2_000 });
  });

  it("reads over_allocated straight from the warning", () => {
    const warnings: readonly SplitWarning[] = [{ code: "over_allocated", excessMinor: 500 }];
    expect(resolveAllocationState(warnings)).toEqual({ kind: "over", excessMinor: 500 });
  });

  it("is exact when there are no allocation warnings", () => {
    expect(resolveAllocationState([])).toEqual({ kind: "exact" });
  });
});

describe("AllocationBar", () => {
  it("mockup state: kosong — nothing allocated yet, full remaining shown", () => {
    render(
      <AllocationBar
        members={[
          { memberId: "m1", color: "--m-1", shareMinor: 0 },
          { memberId: "m2", color: "--m-2", shareMinor: 0 },
        ]}
        totalMinor={10_000}
        currency="IDR"
        warnings={[{ code: "under_allocated", remainingMinor: 10_000 }]}
      />,
    );
    expect(screen.getByText(withoutNbsp(t("expense.warning.underAllocated", { amount: formatMoney(10_000, "IDR") })))).toBeInTheDocument();
  });

  it("mockup state: terisi sebagian — under-allocated, remaining amount from the engine warning", () => {
    render(
      <AllocationBar
        members={[
          { memberId: "m1", color: "--m-1", shareMinor: 4_000 },
          { memberId: "m2", color: "--m-2", shareMinor: 0 },
        ]}
        totalMinor={10_000}
        currency="IDR"
        warnings={[{ code: "under_allocated", remainingMinor: 6_000 }]}
      />,
    );
    expect(screen.getByText(withoutNbsp(t("expense.warning.underAllocated", { amount: formatMoney(6_000, "IDR") })))).toBeInTheDocument();
  });

  it("mockup state: pas — exact, no warnings", () => {
    render(
      <AllocationBar
        members={[
          { memberId: "m1", color: "--m-1", shareMinor: 5_000 },
          { memberId: "m2", color: "--m-2", shareMinor: 5_000 },
        ]}
        totalMinor={10_000}
        currency="IDR"
        warnings={[]}
      />,
    );
    expect(screen.getByText(t("expense.allocation.exact"))).toBeInTheDocument();
  });

  it("mockup state: lebih — over-allocated, bar runs past the target line rather than being clipped", () => {
    const { container } = render(
      <AllocationBar
        members={[
          { memberId: "m1", color: "--m-1", shareMinor: 8_000 },
          { memberId: "m2", color: "--m-2", shareMinor: 4_000 },
        ]}
        totalMinor={10_000}
        currency="IDR"
        warnings={[{ code: "over_allocated", excessMinor: 2_000 }]}
      />,
    );
    expect(screen.getByText(withoutNbsp(t("expense.warning.overAllocated", { amount: formatMoney(2_000, "IDR") })))).toBeInTheDocument();
    const segments = container.querySelectorAll('[style*="--m-1"], [style*="--m-2"]');
    const totalSegmentWidth = Array.from(segments).reduce((sum, el) => {
      const width = (el as HTMLElement).style.width;
      return sum + Number.parseFloat(width);
    }, 0);
    // 12,000 allocated over a 12,000 denominator (max(total, allocated)) is
    // 100% of the bar — past where the 10,000 target line sits (83.3%).
    expect(totalSegmentWidth).toBeCloseTo(100, 0);
  });

  it("uses each member's own color for its segment", () => {
    const { container } = render(
      <AllocationBar members={MEMBERS.map((m, i) => ({ ...m, shareMinor: i === 0 ? 3_000 : 0 }))} totalMinor={10_000} currency="IDR" warnings={[]} />,
    );
    const segment = container.querySelector('[style*="var(--m-1)"]');
    expect(segment).not.toBeNull();
  });
});
