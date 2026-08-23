import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { PaymentNoteSheet, type PaymentNoteSheetTarget } from "./PaymentNoteSheet";

const TARGET: PaymentNoteSheetTarget = {
  memberId: "m-farhan",
  name: "Farhan",
  netMinor: -705_000,
  paymentNote: "GoPay 0812-3456-7890 a.n. Farhan M. A.",
  canRemind: false,
};

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});

describe("PaymentNoteSheet", () => {
  it("shows the note exactly as stored, including odd-shaped text, never reformatted", () => {
    const oddNote = "rek: 001-002-003 // gopay: 0812 (bukan rekening bank biasa)";
    render(
      <PaymentNoteSheet
        open
        target={{ ...TARGET, paymentNote: oddNote }}
        currency="IDR"
        groupName="Trip Bali"
        onClose={vi.fn()}
        onRemind={vi.fn()}
      />,
    );
    expect(screen.getByText(oddNote)).toBeInTheDocument();
  });

  it("shows an honest empty state when the member hasn't set a payment note", () => {
    render(
      <PaymentNoteSheet
        open
        target={{ ...TARGET, paymentNote: undefined }}
        currency="IDR"
        groupName="Trip Bali"
        onClose={vi.fn()}
        onRemind={vi.fn()}
      />,
    );
    expect(screen.getByText(t("settle.note.empty"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("settle.note.copyButton") })).not.toBeInTheDocument();
  });

  it("copies the note via the clipboard API and shows confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(
      <PaymentNoteSheet open target={TARGET} currency="IDR" groupName="Trip Bali" onClose={vi.fn()} onRemind={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: t("settle.note.copyButton") }));

    expect(writeText).toHaveBeenCalledWith(TARGET.paymentNote);
    expect(await screen.findByRole("button", { name: t("settle.note.copyDone") })).toBeInTheDocument();
  });

  it("reports a failed copy honestly instead of pretending it worked", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(
      <PaymentNoteSheet open target={TARGET} currency="IDR" groupName="Trip Bali" onClose={vi.fn()} onRemind={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: t("settle.note.copyButton") }));

    expect(await screen.findByRole("button", { name: t("settle.note.copyFailed") })).toBeInTheDocument();
  });

  it("shows the remind shortcut only when the target allows it", () => {
    const { rerender } = render(
      <PaymentNoteSheet
        open
        target={{ ...TARGET, canRemind: true }}
        currency="IDR"
        groupName="Trip Bali"
        onClose={vi.fn()}
        onRemind={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: t("settle.note.remindCta") })).toBeInTheDocument();

    rerender(
      <PaymentNoteSheet
        open
        target={{ ...TARGET, canRemind: false }}
        currency="IDR"
        groupName="Trip Bali"
        onClose={vi.fn()}
        onRemind={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: t("settle.note.remindCta") })).not.toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <PaymentNoteSheet open={false} target={TARGET} currency="IDR" groupName="Trip Bali" onClose={vi.fn()} onRemind={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
