import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { LockedActionExplain } from "@/shared/system/lockedAction/LockedActionExplain";

describe("LockedActionExplain", () => {
  it("names the member and cites their transaction count", () => {
    render(<LockedActionExplain name="Farhan" transactionCount={8} onDeactivate={vi.fn()} />);
    expect(screen.getByText(t("system.locked.reason", { name: "Farhan", count: 8 }))).toBeInTheDocument();
  });

  it("fires onDeactivate when the deactivate link is pressed", () => {
    const onDeactivate = vi.fn();
    render(<LockedActionExplain name="Farhan" transactionCount={8} onDeactivate={onDeactivate} />);
    fireEvent.click(screen.getByRole("button", { name: t("system.locked.deactivate", { name: "Farhan" }) }));
    expect(onDeactivate).toHaveBeenCalledOnce();
  });

  it("resolves plural form through Intl.PluralRules for a single transaction", () => {
    render(<LockedActionExplain name="Andi" transactionCount={1} onDeactivate={vi.fn()} />);
    expect(screen.getByText(t("system.locked.reason", { name: "Andi", count: 1 }))).toBeInTheDocument();
  });
});
