import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/shared/ui/Button/Button";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";

describe("BottomBar", () => {
  it("renders a single button", () => {
    render(
      <BottomBar>
        <Button>Simpan pengeluaran</Button>
      </BottomBar>,
    );
    expect(screen.getByRole("button", { name: "Simpan pengeluaran" })).toBeInTheDocument();
  });

  it("renders two stacked buttons", () => {
    render(
      <BottomBar>
        <Button>Bagi berdua</Button>
        <Button variant="ghost">Batal, bukan punyaku</Button>
      </BottomBar>,
    );
    expect(screen.getByRole("button", { name: "Bagi berdua" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Batal, bukan punyaku" })).toBeInTheDocument();
  });
});
