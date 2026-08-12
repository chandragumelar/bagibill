import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";

describe("Topbar", () => {
  it("renders the title and optional leading/trailing slots", () => {
    render(<Topbar title="Tambah pengeluaran" leading={<span>kiri</span>} trailing={<span>kanan</span>} />);
    expect(screen.getByRole("heading", { name: "Tambah pengeluaran" })).toBeInTheDocument();
    expect(screen.getByText("kiri")).toBeInTheDocument();
    expect(screen.getByText("kanan")).toBeInTheDocument();
  });

  it("renders without slots when none are given", () => {
    render(<Topbar title="Kelola member" />);
    expect(screen.getByRole("heading", { name: "Kelola member" })).toBeInTheDocument();
  });
});

describe("TopbarButton", () => {
  it("renders a text button and fires onClick", () => {
    const onClick = vi.fn();
    render(<TopbarButton label="Batal" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders an icon button with the label as its accessible name", () => {
    const onClick = vi.fn();
    render(<TopbarButton label="Kembali" onClick={onClick} icon={<span aria-hidden="true">‹</span>} />);
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
