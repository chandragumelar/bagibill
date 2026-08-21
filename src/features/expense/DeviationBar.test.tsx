import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { t, formatMoney } from "@/lib/i18n";
import { DeviationBar } from "./DeviationBar";

// RTL's default text matcher normalizes DOM whitespace (including the
// non-breaking space Intl puts between currency and amount) down to a plain
// space before comparing — so the expected string needs the same treatment.
function money(amountMinor: number): string {
  return formatMoney(amountMinor, "IDR").replace(/\u00a0/g, " ");
}

describe("DeviationBar", () => {
  it("mockup state: tanpa penyesuaian — zero adjustment shows no badge, share equals the even base", () => {
    const { container } = render(
      <DeviationBar shareMinor={3_000} adjustmentMinor={0} maxAbsAdjustmentMinor={5_000} currency="IDR" />,
    );
    expect(screen.getByText(money(3_000))).toBeInTheDocument();
    expect(container.querySelector('[class*="badge"]')).toBeNull();
    expect(container.querySelector('[class*="fill"]')).toBeNull();
  });

  it("mockup state: plus dan minus bercampur — a top-up shows the added badge and a larger final share", () => {
    render(<DeviationBar shareMinor={8_000} adjustmentMinor={5_000} maxAbsAdjustmentMinor={5_000} currency="IDR" />);
    expect(screen.getByText(money(8_000))).toBeInTheDocument();
    expect(screen.getByText(t("expense.deviation.added", { amount: `+${money(5_000)}` }))).toBeInTheDocument();
  });

  it("mockup state: plus dan minus bercampur — a deduction shows the deducted badge", () => {
    render(<DeviationBar shareMinor={1_000} adjustmentMinor={-2_000} maxAbsAdjustmentMinor={5_000} currency="IDR" />);
    expect(screen.getByText(t("expense.deviation.deducted", { amount: money(-2_000) }))).toBeInTheDocument();
  });

  it("mockup state: potongan ekstrem — shows the negative share as an actual minus value, not clamped to zero", () => {
    render(<DeviationBar shareMinor={-1_500} adjustmentMinor={-10_000} maxAbsAdjustmentMinor={10_000} currency="IDR" />);
    expect(screen.getByText(money(-1_500))).toBeInTheDocument();
    expect(screen.queryByText(money(0))).not.toBeInTheDocument();
  });
});
