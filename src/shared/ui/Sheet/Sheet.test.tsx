import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sheet } from "@/shared/ui/Sheet/Sheet";

describe("Sheet", () => {
  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={vi.fn()} title="Dari mana angka ini">
        isi
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title, subtitle, and children when open", () => {
    render(
      <Sheet open onClose={vi.fn()} title="Dari mana angka ini" subtitle="Telusuri sampai transaksi aslinya.">
        isi sheet
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Dari mana angka ini");
    expect(screen.getByText("Telusuri sampai transaksi aslinya.")).toBeInTheDocument();
    expect(screen.getByText("isi sheet")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Dari mana angka ini">
        isi
      </Sheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the scrim is clicked but not when the sheet body is clicked", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Dari mana angka ini">
        isi
      </Sheet>,
    );
    fireEvent.click(screen.getByText("isi"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
