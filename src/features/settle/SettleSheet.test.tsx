import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { SettleSheet, type SettleSheetTarget } from "./SettleSheet";

const TARGET: SettleSheetTarget = {
  fromMemberId: "m-farhan",
  fromName: "Farhan",
  fromColor: "--m-2",
  toMemberId: "m-nadia",
  toName: "Nadia",
  toColor: "--m-1",
  suggestedAmountMinor: 705_000,
};

describe("SettleSheet", () => {
  it("starts the amount field at the suggested transfer amount", () => {
    render(
      <SettleSheet open target={TARGET} currency="IDR" nowMs={1_700_000_000_000} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByLabelText(t("settle.form.amountLabel"))).toHaveValue("705000");
  });

  it("allows the amount to be reduced below the suggestion — spec.md 11.3 partial payoff", () => {
    render(
      <SettleSheet open target={TARGET} currency="IDR" nowMs={1_700_000_000_000} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    const amountField = screen.getByLabelText(t("settle.form.amountLabel"));
    fireEvent.change(amountField, { target: { value: "400000" } });
    expect(amountField).toHaveValue("400000");
  });

  it("calls onSave with the fields shaped for the repository", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SettleSheet open target={TARGET} currency="IDR" nowMs={1_700_000_000_000} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: t("settle.form.saveButton") }));

    await screen.findByRole("button", { name: t("settle.form.saveButton") });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        fromMemberId: "m-farhan",
        toMemberId: "m-nadia",
        amountMinor: 705_000,
        currency: "IDR",
      }),
    );
  });

  it("closes the sheet after a successful save", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SettleSheet open target={TARGET} currency="IDR" nowMs={1_700_000_000_000} onClose={onClose} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: t("settle.form.saveButton") }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows a failure message and keeps the sheet open when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("boom"));
    render(<SettleSheet open target={TARGET} currency="IDR" nowMs={1_700_000_000_000} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: t("settle.form.saveButton") }));

    expect(await screen.findByText(t("common.saveFailed"))).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <SettleSheet open={false} target={TARGET} currency="IDR" nowMs={1_700_000_000_000} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
