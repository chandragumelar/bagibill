import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { HoldToDeleteButton } from "@/shared/system/holdToDelete/HoldToDeleteButton";

describe("HoldToDeleteButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the initial label before anything is pressed", () => {
    render(<HoldToDeleteButton label="Tahan untuk hapus" completingLabel="Terhapus" onComplete={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Tahan untuk hapus");
  });

  it("does not complete on a quick tap released before the hold duration", () => {
    const onComplete = vi.fn();
    render(<HoldToDeleteButton label="Tahan untuk hapus" completingLabel="Terhapus" onComplete={onComplete} />);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { pointerId: 1 });
    vi.advanceTimersByTime(300);
    fireEvent.pointerUp(button, { pointerId: 1 });
    vi.advanceTimersByTime(2000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(button).toHaveTextContent("Tahan untuk hapus");
  });

  it("completes after holding through --dur-hold plus the display delay", () => {
    const onComplete = vi.fn();
    render(<HoldToDeleteButton label="Tahan untuk hapus" completingLabel="Terhapus" onComplete={onComplete} />);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(1100 + 650);
    });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(button).toHaveTextContent("Terhapus");
  });

  it("supports keyboard activation with space/enter and cancels on keyup", () => {
    const onComplete = vi.fn();
    render(<HoldToDeleteButton label="Tahan untuk hapus" completingLabel="Terhapus" onComplete={onComplete} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    vi.advanceTimersByTime(300);
    fireEvent.keyUp(button, { key: "Enter" });
    vi.advanceTimersByTime(2000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("ignores repeated keydown events from a held key", () => {
    const onComplete = vi.fn();
    render(<HoldToDeleteButton label="Tahan untuk hapus" completingLabel="Terhapus" onComplete={onComplete} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    vi.advanceTimersByTime(1100 + 650);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
