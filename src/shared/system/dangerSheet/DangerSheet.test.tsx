import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DangerSheet } from "@/shared/system/dangerSheet/DangerSheet";

const baseProps = {
  title: "Hapus grup Trip Bali 2026?",
  subtitle: "Grup dan seluruh isinya hilang untuk semua anggota.",
  badgeLabel: "Permanen · tak bisa ditarik",
  losingItems: <li>29 transaksi</li>,
  irreversibleNote: "Anggota lain akan lihat grup ini hilang tanpa pemberitahuan.",
  holdLabel: "Tahan untuk hapus permanen",
  completingLabel: "Grup dihapus",
  hint: "Tahan tombol ~1 detik",
  cancelLabel: "Batal, simpan grupnya",
};

describe("DangerSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when closed", () => {
    render(<DangerSheet {...baseProps} open={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the badge, losing items, and hold button when open", () => {
    render(<DangerSheet {...baseProps} open onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText("Permanen · tak bisa ditarik")).toBeInTheDocument();
    expect(screen.getByText("29 transaksi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tahan untuk hapus permanen/ })).toBeInTheDocument();
  });

  it("fires onClose when the cancel button is pressed", () => {
    const onClose = vi.fn();
    render(<DangerSheet {...baseProps} open onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Batal, simpan grupnya" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fires onConfirm only after the hold gesture completes", () => {
    const onConfirm = vi.fn();
    render(<DangerSheet {...baseProps} open onClose={vi.fn()} onConfirm={onConfirm} />);
    const holdButton = screen.getByRole("button", { name: /Tahan untuk hapus permanen/ });
    fireEvent.pointerDown(holdButton, { pointerId: 1 });
    vi.advanceTimersByTime(1100 + 650);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("traps Tab between the hold button and the cancel button", () => {
    render(<DangerSheet {...baseProps} open onClose={vi.fn()} onConfirm={vi.fn()} />);
    const holdButton = screen.getByRole("button", { name: /Tahan untuk hapus permanen/ });
    const cancelButton = screen.getByRole("button", { name: "Batal, simpan grupnya" });
    cancelButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(holdButton);
  });
});
