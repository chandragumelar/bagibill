import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/shared/ui/Avatar/Avatar";

describe("Avatar", () => {
  it("is hidden from screen readers when no name is given (header stack use)", () => {
    const { container } = render(<Avatar initials="DP" color="var(--m-3)" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("exposes an accessible name when one is given", () => {
    render(<Avatar initials="DP" color="var(--m-3)" name="Dimas Prasetyo" />);
    expect(screen.getByRole("img", { name: "Dimas Prasetyo" })).toBeInTheDocument();
  });

  it("renders the initials text", () => {
    render(<Avatar initials="DP" color="var(--m-3)" name="Dimas Prasetyo" />);
    expect(screen.getByText("DP")).toBeInTheDocument();
  });

  it("wraps in an outer ring when the color repeats (13th member, K-07)", () => {
    const { container } = render(<Avatar initials="A" color="var(--m-1)" name="Ayu" colorRepeated />);
    // Cincin luar membungkus lingkaran avatar: dua <span> bersarang, bukan satu.
    expect(container.querySelector("span > span")).toBeInTheDocument();
  });

  it("does not add an outer ring when the color is not repeated", () => {
    const { container } = render(<Avatar initials="A" color="var(--m-1)" name="Ayu" />);
    expect(container.querySelector("span > span")).not.toBeInTheDocument();
  });
});
