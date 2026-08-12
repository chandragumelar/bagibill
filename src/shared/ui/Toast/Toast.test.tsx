import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { Toast } from "@/shared/ui/Toast/Toast";

describe("Toast", () => {
  it("renders the message and countdown number", () => {
    render(<Toast message="Sate Padang dihapus" secondsRemaining={6} secondsTotal={6} onUndo={vi.fn()} />);
    expect(screen.getByText("Sate Padang dihapus")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("fires onUndo when the undo button is pressed", () => {
    const onUndo = vi.fn();
    render(<Toast message="Sate Padang dihapus" secondsRemaining={6} secondsTotal={6} onUndo={onUndo} />);
    fireEvent.click(screen.getByRole("button", { name: t("toast.undo") }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("shows the stacked count and undo-all button only when count is greater than one", () => {
    const onUndoAll = vi.fn();
    render(
      <Toast
        message="2 transaksi dihapus"
        secondsRemaining={6}
        secondsTotal={6}
        count={2}
        onUndo={vi.fn()}
        onUndoAll={onUndoAll}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t("toast.undoAll") }));
    expect(onUndoAll).toHaveBeenCalledOnce();
  });

  it("does not show the undo-all button for a single item", () => {
    render(<Toast message="Sate Padang dihapus" secondsRemaining={6} secondsTotal={6} count={1} onUndo={vi.fn()} />);
    expect(screen.queryByRole("button", { name: t("toast.undoAll") })).not.toBeInTheDocument();
  });
});
