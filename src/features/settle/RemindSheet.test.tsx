import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { RemindSheet, type RemindSheetTarget } from "./RemindSheet";

const TARGET: RemindSheetTarget = {
  debtorName: "Farhan",
  groupName: "Trip Bali 2026",
  formattedAmount: "Rp 705.000",
  recipientNote: "BCA 1234567890 a.n. Nadia Putri",
};

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});

describe("RemindSheet", () => {
  it("shows a ready-to-send preview containing the group, amount, and debtor", () => {
    render(<RemindSheet open target={TARGET} onClose={vi.fn()} share={undefined} />);
    expect(screen.getByText(/Trip Bali 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Rp 705\.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/Farhan/).length).toBeGreaterThan(0);
  });

  it("hides the share button when the Web Share API isn't available", () => {
    render(<RemindSheet open target={TARGET} onClose={vi.fn()} share={undefined} />);
    expect(screen.queryByRole("button", { name: t("settle.remind.shareButton") })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("settle.remind.copyButton") })).toBeInTheDocument();
  });

  it("shows the share button and invokes it when available", () => {
    const share = vi.fn().mockResolvedValue(undefined);
    render(<RemindSheet open target={TARGET} onClose={vi.fn()} share={share} />);

    fireEvent.click(screen.getByRole("button", { name: t("settle.remind.shareButton") }));

    expect(share).toHaveBeenCalledWith(expect.stringContaining("Farhan"));
  });

  it("copies the message via the clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<RemindSheet open target={TARGET} onClose={vi.fn()} share={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: t("settle.remind.copyButton") }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Farhan"));
    expect(await screen.findByRole("button", { name: t("settle.remind.copyDone") })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<RemindSheet open={false} target={TARGET} onClose={vi.fn()} share={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
