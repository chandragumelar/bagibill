import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useFocusTrap } from "@/shared/system/focusTrap/useFocusTrap";

function TrapDemo({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref}>
      <button>Pertama</button>
      <button>Kedua</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("wraps Tab from the last focusable element back to the first", () => {
    render(<TrapDemo active />);
    const last = screen.getByRole("button", { name: "Kedua" });
    const first = screen.getByRole("button", { name: "Pertama" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("wraps Shift+Tab from the first focusable element back to the last", () => {
    render(<TrapDemo active />);
    const last = screen.getByRole("button", { name: "Kedua" });
    const first = screen.getByRole("button", { name: "Pertama" });
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("does nothing when inactive", () => {
    render(<TrapDemo active={false} />);
    const last = screen.getByRole("button", { name: "Kedua" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(last);
  });
});
