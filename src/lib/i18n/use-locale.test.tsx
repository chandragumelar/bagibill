import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n/locale-store";
import { useLocale } from "@/lib/i18n/use-locale";

function LocaleProbe() {
  const { locale, setLocale: change } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => change("en")}>ganti ke en</button>
    </div>
  );
}

describe("useLocale", () => {
  it("re-render otomatis waktu locale ganti, tanpa reload", () => {
    setLocale("id");
    render(<LocaleProbe />);
    expect(screen.getByTestId("locale")).toHaveTextContent("id");

    act(() => {
      screen.getByRole("button").click();
    });

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });
});
