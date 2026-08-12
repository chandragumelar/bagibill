import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InlineFailure } from "@/shared/system/failure/InlineFailure";

describe("InlineFailure", () => {
  it("renders the message and retry label", () => {
    render(<InlineFailure message="Gagal menyimpan." retryLabel="Ulangi" onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal menyimpan.");
    expect(screen.getByRole("button", { name: /Ulangi/ })).toBeInTheDocument();
  });

  it("fires onRetry when the retry button is pressed", () => {
    const onRetry = vi.fn();
    render(<InlineFailure message="Gagal menyimpan." retryLabel="Ulangi" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /Ulangi/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("defaults to the boxed variant", () => {
    const { container } = render(<InlineFailure message="Gagal menyimpan." retryLabel="Ulangi" onRetry={vi.fn()} />);
    expect(container.querySelector('[class*="boxed"]')).toBeInTheDocument();
  });

  it("supports the attached variant for row-level failures", () => {
    const { container } = render(
      <InlineFailure message="Baris ini gagal." retryLabel="Ulangi" onRetry={vi.fn()} variant="attached" />,
    );
    expect(container.querySelector('[class*="attached"]')).toBeInTheDocument();
  });
});
