import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { GroupHeader } from "@/app/layout/GroupHeader/GroupHeader";

describe("GroupHeader", () => {
  it("renders the title and fires onBack", () => {
    const onBack = vi.fn();
    render(
      <GroupHeader title="Trip Bali 2026" onBack={onBack} position={{ amount: "−Rp 485.000", sign: "neg", sub: "Kamu utang" }} />,
    );
    expect(screen.getByRole("heading", { name: "Trip Bali 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t("nav.back") }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("only renders the menu button when onMenu is given", () => {
    const { rerender } = render(
      <GroupHeader title="Trip Bali 2026" onBack={vi.fn()} position={{ amount: "Rp 0", sign: "zero", sub: "Belum ada apa-apa" }} />,
    );
    expect(screen.queryByRole("button", { name: t("nav.menu") })).not.toBeInTheDocument();

    const onMenu = vi.fn();
    rerender(
      <GroupHeader
        title="Trip Bali 2026"
        onBack={vi.fn()}
        onMenu={onMenu}
        position={{ amount: "Rp 0", sign: "zero", sub: "Belum ada apa-apa" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: t("nav.menu") }));
    expect(onMenu).toHaveBeenCalledOnce();
  });

  it("renders the position card as a plain block when there is no onClick", () => {
    render(
      <GroupHeader title="Trip Bali 2026" onBack={vi.fn()} position={{ amount: "Rp 0", sign: "zero", sub: "Belum ada apa-apa" }} />,
    );
    expect(screen.queryByRole("button", { name: new RegExp(t("group.position.label")) })).not.toBeInTheDocument();
  });

  it("renders the position card as a button and fires onClick when given one", () => {
    const onClick = vi.fn();
    render(
      <GroupHeader
        title="Trip Bali 2026"
        onBack={vi.fn()}
        position={{ amount: "+Rp 1.240.000", sign: "pos", sub: "3 orang bayar ke kamu", onClick }}
      />,
    );
    fireEvent.click(screen.getByText("+Rp 1.240.000"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders the tab bar passed as children inside the header", () => {
    render(
      <GroupHeader title="Trip Bali 2026" onBack={vi.fn()} position={{ amount: "Rp 0", sign: "zero", sub: "Belum ada apa-apa" }}>
        <div>tabs di sini</div>
      </GroupHeader>,
    );
    expect(screen.getByText("tabs di sini")).toBeInTheDocument();
  });
});
