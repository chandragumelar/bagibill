import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { setLocale, t } from "@/lib/i18n";
import { navigate } from "@/routes/router";
import { HomeScreen } from "./HomeScreen";
import { useHomeGroups, type HomeGroupViewModel } from "./use-home-groups";

vi.mock("./use-home-groups", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./use-home-groups")>();
  return { ...actual, useHomeGroups: vi.fn() };
});

vi.mock("@/routes/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/routes/router")>();
  return { ...actual, navigate: vi.fn() };
});

const GROUP: HomeGroupViewModel = {
  slug: "trip-bali",
  name: "Trip Bali",
  currency: "IDR",
  memberCount: 2,
  avatarMembers: [],
  netMinor: 0,
  expenseCount: 1,
  hasTransactions: true,
};

afterEach(() => {
  vi.clearAllMocks();
  setLocale("en");
});

describe("HomeScreen", () => {
  it("renders one New group action with a decorative plus icon", () => {
    vi.mocked(useHomeGroups).mockReturnValue({ status: "ready", groups: [GROUP] });
    render(<HomeScreen />);

    const actions = screen.getAllByRole("button", { name: "New group" });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();

    fireEvent.click(actions[0] as HTMLButtonElement);
    expect(navigate).toHaveBeenCalledWith("/app/new");
  });

  it("provides the retained action in Indonesian", () => {
    setLocale("id");
    vi.mocked(useHomeGroups).mockReturnValue({ status: "ready", groups: [GROUP] });
    render(<HomeScreen />);

    expect(screen.getByRole("button", { name: t("home.section.addGroup") })).toHaveTextContent("Grup baru");
  });
});
