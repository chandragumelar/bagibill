import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TextInput } from "@/shared/ui/TextInput/TextInput";

const textInputStyles = readFileSync(resolve(process.cwd(), "src/shared/ui/TextInput/TextInput.module.css"), "utf8");
const designTokens = readFileSync(resolve(process.cwd(), "packages/tokens/tokens.css"), "utf8");

describe("TextInput", () => {
  it("exposes the label to screen readers", () => {
    render(<TextInput label="Nama" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Nama")).toBeInTheDocument();
  });

  it("calls onChange with the typed value", () => {
    const onChange = vi.fn();
    render(<TextInput label="Nama" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Dimas" } });
    expect(onChange).toHaveBeenCalledWith("Dimas");
  });

  it("renders the warning and links it via aria-describedby", () => {
    render(<TextInput label="Nama" value="Dimas" onChange={vi.fn()} warning="Sudah ada Dimas di grup ini." />);
    const input = screen.getByLabelText("Nama");
    const warning = screen.getByRole("alert");
    expect(warning).toHaveTextContent("Sudah ada Dimas di grup ini.");
    expect(input.getAttribute("aria-describedby")).toBe(warning.id);
  });

  it("omits aria-describedby when there is no warning", () => {
    render(<TextInput label="Nama" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Nama")).not.toHaveAttribute("aria-describedby");
  });

  it("keeps interactive text at least 16px to prevent mobile auto-zoom", () => {
    expect(textInputStyles).toMatch(/\.field\s*\{[^}]*font-size:\s*var\(--fs-body\)/s);

    const bodySizeMatch = designTokens.match(/--fs-body:\s*([\d.]+)px/);
    expect(bodySizeMatch).not.toBeNull();
    expect(Number(bodySizeMatch?.[1])).toBeGreaterThanOrEqual(16);
  });
});
