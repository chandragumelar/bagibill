import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListRow } from "@/shared/ui/ListRow/ListRow";

describe("ListRow", () => {
  it("renders leading, content, and trailing slots", () => {
    render(<ListRow leading={<span>icon</span>} trailing={<span>−Rp 60.000</span>}>Sate Padang</ListRow>);
    expect(screen.getByText("icon")).toBeInTheDocument();
    expect(screen.getByText("Sate Padang")).toBeInTheDocument();
    expect(screen.getByText("−Rp 60.000")).toBeInTheDocument();
  });

  it("renders as a plain row when there is no onClick", () => {
    render(<ListRow leading={<span>icon</span>}>Sate Padang</ListRow>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as an interactive button and fires onClick when given one", () => {
    const onClick = vi.fn();
    render(
      <ListRow leading={<span>icon</span>} onClick={onClick}>
        Sate Padang
      </ListRow>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("omits the trailing slot when not given", () => {
    const { container } = render(<ListRow leading={<span>icon</span>}>Sate Padang</ListRow>);
    expect(container.querySelector('[class*="trailing"]')).not.toBeInTheDocument();
  });
});
