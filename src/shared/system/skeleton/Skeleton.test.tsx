import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/shared/system/skeleton/Skeleton";

describe("Skeleton", () => {
  it("renders a card variant hidden from screen readers", () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("card");
  });

  it("renders a line variant with a custom width", () => {
    const { container } = render(<Skeleton variant="line" width="60%" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("line");
    expect(el.style.width).toBe("60%");
  });

  it("has no inline width when none is given", () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("");
  });
});
