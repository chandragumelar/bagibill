import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarStack } from "@/shared/ui/AvatarStack/AvatarStack";

function members(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: `m${index}`,
    initials: `M${index}`,
    color: "var(--m-1)",
  }));
}

describe("AvatarStack", () => {
  it("renders every member when under the max", () => {
    render(<AvatarStack members={members(3)} />);
    expect(screen.getByText("M0")).toBeInTheDocument();
    expect(screen.getByText("M1")).toBeInTheDocument();
    expect(screen.getByText("M2")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("caps at max and shows the overflow badge", () => {
    render(<AvatarStack members={members(6)} max={4} />);
    expect(screen.getByText("M0")).toBeInTheDocument();
    expect(screen.getByText("M3")).toBeInTheDocument();
    expect(screen.queryByText("M4")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("is hidden from screen readers — the caller supplies the accessible count", () => {
    const { container } = render(<AvatarStack members={members(2)} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
