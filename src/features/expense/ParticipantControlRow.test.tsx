import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParticipantControlRow } from "./ParticipantControlRow";

// jsdom nol menjalankan layout beneran, jadi tabrakan visual pixel-demi-
// pixel (F4-04) nol bisa dikunci di sini. Yang dikunci: struktur DOM yang
// bikin tabrakan itu MUNGKIN terjadi di ListRow (grid auto + minmax(0,1fr)
// tanpa ellipsis pada nama) sudah nol dipakai lagi — nama dan trailing
// adalah dua saudara flex, dan nama pakai class yang mengunci ellipsis.
describe("ParticipantControlRow", () => {
  it("renders leading, name, and trailing as three sibling slots in one flex row — not one nested inside another", () => {
    const { container } = render(
      <ParticipantControlRow leading={<span>avatar</span>} name="Dimas Prasetyo" trailing={<button type="button">+</button>} />,
    );
    const row = container.firstElementChild;
    expect(row?.children).toHaveLength(4);

    const [toggleSlot, leadingSlot, contentSlot, trailingSlot] = Array.from(row?.children ?? []);
    expect(toggleSlot?.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(leadingSlot?.textContent).toBe("avatar");
    expect(contentSlot?.textContent).toContain("Dimas Prasetyo");
    expect(trailingSlot?.textContent).toBe("+");
    // The control never sits inside the name's box (or vice versa) — the
    // grid-collision bug painted the control's opaque background OVER the
    // name precisely because they weren't laid out as independent siblings.
    expect(trailingSlot?.contains(screen.getByText("Dimas Prasetyo"))).toBe(false);
  });

  it("gives the name the shared ellipsis-truncation class, so a long name shrinks instead of overflowing behind the trailing control", () => {
    render(<ParticipantControlRow leading={<span>avatar</span>} name="Nama Sangat Panjang Sekali Banget" trailing={<button type="button">+</button>} />);
    const name = screen.getByText("Nama Sangat Panjang Sekali Banget");
    expect(name.className).toContain("memberName");
  });

  it("renders optional secondary content (badge, note, DeviationBar) inside the name column, not the trailing column", () => {
    const { container } = render(
      <ParticipantControlRow
        leading={<span>avatar</span>}
        name="Sarah"
        secondary={<span data-testid="secondary">catatan</span>}
        trailing={<button type="button">+</button>}
      />,
    );
    const row = container.firstElementChild;
    const contentSlot = row?.children[2];
    expect(contentSlot?.querySelector('[data-testid="secondary"]')).not.toBeNull();
    const trailingSlot = row?.children[3];
    expect(trailingSlot?.querySelector('[data-testid="secondary"]')).toBeNull();
  });

  it("keeps trailing controls independent from content when row must shrink", () => {
    const { container } = render(
      <ParticipantControlRow
        leading={<span>avatar</span>}
        name="Farhan Maulana Abdurrahman"
        secondary={<span data-testid="money">IDR 25.000</span>}
        trailing={
          <div>
            <button type="button">−</button>
            <input aria-label="weight" />
            <button type="button">+</button>
          </div>
        }
      />,
    );
    const row = container.firstElementChild;
    const contentSlot = row?.children[2];
    const trailingSlot = row?.children[3];

    expect(contentSlot?.textContent).toContain("IDR 25.000");
    expect(trailingSlot?.querySelectorAll("button")).toHaveLength(2);
    expect(trailingSlot?.querySelector("input")).not.toBeNull();
    expect(contentSlot?.contains(trailingSlot ?? null)).toBe(false);
  });

  it("omits the secondary slot's content entirely when not given", () => {
    const { container } = render(<ParticipantControlRow leading={<span>avatar</span>} name="Sarah" trailing={<button type="button">+</button>} />);
    expect(container.textContent).toBe("avatarSarah+");
  });
});
