import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LoadFailure } from "@/shared/system/failure/LoadFailure";

describe("LoadFailure", () => {
  it("renders the heading, message, and retry button", () => {
    render(
      <LoadFailure
        heading="Grup ini gagal dimuat"
        message="HP-mu lagi nggak bisa nyambung."
        retryLabel="Muat ulang"
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Grup ini gagal dimuat" })).toBeInTheDocument();
    expect(screen.getByText("HP-mu lagi nggak bisa nyambung.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Muat ulang/ })).toBeInTheDocument();
  });

  it("fires onRetry when the retry button is pressed", () => {
    const onRetry = vi.fn();
    render(<LoadFailure heading="Gagal" message="Coba lagi." retryLabel="Muat ulang" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /Muat ulang/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
