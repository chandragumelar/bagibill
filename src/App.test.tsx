import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { App, resolveBranch } from "@/App";

describe("resolveBranch", () => {
  it("returns a distinct component per branch", () => {
    const claim = resolveBranch("/c/trip-bali/exp-1");
    const join = resolveBranch("/j/trip-bali");
    const devUi = resolveBranch("/dev/ui");
    const app = resolveBranch("/app");
    const branches = [claim, join, devUi, app];
    expect(new Set(branches).size).toBe(branches.length);
  });

  it("returns the same claim component regardless of slug/expenseId", () => {
    expect(resolveBranch("/c/trip-bali/exp-1")).toBe(resolveBranch("/c/kopdar/exp-9"));
  });

  it("falls back to the app branch for anything that isn't /c/, /j/, or /dev/ui", () => {
    expect(resolveBranch("/whatever")).toBe(resolveBranch("/app"));
    expect(resolveBranch("/")).toBe(resolveBranch("/g/trip-bali"));
  });
});

describe("App", () => {
  afterEach(() => {
    window.history.pushState(null, "", "/");
  });

  it("renders without throwing on the default path", async () => {
    const { container } = render(<App />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it("renders the dev/ui page directly at /dev/ui", async () => {
    window.history.pushState(null, "", "/dev/ui");
    const { findByText } = render(<App />);
    expect(await findByText("Button")).toBeInTheDocument();
  });
});
