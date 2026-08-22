import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository } from "@/lib/storage/repositories";
import { t } from "@/lib/i18n";
import { AppRouter } from "@/routes/router";
import { GroupDetailScreen } from "./GroupDetailScreen";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  window.history.pushState(null, "", "/");
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear()]);
});

async function seedGroup(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug: "g1",
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.put({ memberId: "m1", groupSlug: "g1", name: "Andi", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: "g1", name: "Rina", color: "--m-2", joinedAt: 2_000, seq: 0 });
}

function renderScreen(slug: string): void {
  window.history.pushState(null, "", `/g/${slug}`);
  render(<AppRouter routes={[{ path: "/g/:slug", Component: GroupDetailScreen }]} fallbackPath="/app" />);
}

describe("GroupDetailScreen", () => {
  it("shows the three tabs, Transaksi active by default", async () => {
    await seedGroup();
    renderScreen("g1");

    expect(await screen.findByText("Trip Bali")).toBeInTheDocument();
    const transactionsTab = screen.getByText(t("group.tab.transactions"));
    expect(transactionsTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(t("group.tab.balance"))).toBeInTheDocument();
    expect(screen.getByText(t("group.tab.summary"))).toBeInTheDocument();
    expect(screen.getByText(t("common.noExpensesYet"))).toBeInTheDocument();
  });

  it("shows an honest empty state for tab Saldo, nothing that looks broken", async () => {
    await seedGroup();
    renderScreen("g1");
    await screen.findByText("Trip Bali");

    screen.getByText(t("group.tab.balance")).click();

    expect(await screen.findByText(t("group.balance.emptyHeading"))).toBeInTheDocument();
    expect(screen.queryByText(t("common.noExpensesYet"))).not.toBeInTheDocument();
  });

  it("connects the header's posisi-kamu card to the Saldo tab: tapping it flashes your row", async () => {
    await seedGroup();
    await expenseRepository.createExpense({
      groupSlug: "g1",
      title: "Sate Padang",
      category: "food",
      date: 1_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m2", amountMinor: 10_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m1",
    });
    renderScreen("g1");
    await screen.findByText("Trip Bali");

    screen.getByText(t("group.tab.balance")).click();
    await screen.findByText(t("group.balance.peopleHeading"));

    const positionCard = screen.getByText(t("group.position.label")).closest("button");
    expect(positionCard).not.toBeNull();
    if (positionCard === null) throw new Error("expected the position card to be a button");
    fireEvent.click(positionCard);

    expect(document.querySelector('[class*="highlighted"]')).toBeInTheDocument();
  });

  it("renders a not-found screen for a slug with no matching group", async () => {
    renderScreen("no-such-group");
    expect(await screen.findByText(t("group.notFound.heading"))).toBeInTheDocument();
    expect(screen.getByText(t("group.notFound.body"))).toBeInTheDocument();
  });

  it("renders a full-screen load failure and can retry", async () => {
    await seedGroup();
    const spy = vi.spyOn(expenseRepository, "listExpensesByGroup").mockRejectedValueOnce(new Error("boom"));
    renderScreen("g1");

    expect(await screen.findByText(t("group.error.loadHeading"))).toBeInTheDocument();
    spy.mockRestore();

    screen.getByText(t("system.retry")).click();

    await waitFor(() => {
      expect(screen.getByText("Trip Bali")).toBeInTheDocument();
    });
  });

  it("lists a saved expense once loading finishes", async () => {
    await seedGroup();
    await expenseRepository.createExpense({
      groupSlug: "g1",
      title: "Sate Padang",
      category: "food",
      date: 1_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m1",
    });
    renderScreen("g1");

    expect(await screen.findByText("Sate Padang")).toBeInTheDocument();
  });

  it("cuts the list down to matching rows when searching", async () => {
    await seedGroup();
    await expenseRepository.createExpense({
      groupSlug: "g1",
      title: "Sate Padang",
      category: "food",
      date: 2_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m1",
    });
    await expenseRepository.createExpense({
      groupSlug: "g1",
      title: "Bensin Cirebon",
      category: "transport",
      date: 1_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 75_000,
      payers: [{ memberId: "m2", amountMinor: 75_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m2",
    });
    renderScreen("g1");
    await screen.findByText("Sate Padang");

    fireEvent.change(screen.getByRole("textbox", { name: t("group.filter.searchLabel") }), {
      target: { value: "bensin" },
    });

    expect(screen.getByText("Bensin Cirebon")).toBeInTheDocument();
    expect(screen.queryByText("Sate Padang")).not.toBeInTheDocument();
  });

  it("shows a group-empty state (offers add-expense) when the group truly has no transactions", async () => {
    await seedGroup();
    renderScreen("g1");

    expect(await screen.findByText(t("common.noExpensesYet"))).toBeInTheDocument();
    expect(screen.getByText(t("group.transaction.emptyCta"))).toBeInTheDocument();
    expect(screen.queryByText(t("group.transaction.filteredEmptyHeading"))).not.toBeInTheDocument();
  });

  it("shows a filtered-empty state (offers clearing the filter) when a search matches nothing", async () => {
    await seedGroup();
    await expenseRepository.createExpense({
      groupSlug: "g1",
      title: "Sate Padang",
      category: "food",
      date: 1_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 10_000,
      payers: [{ memberId: "m1", amountMinor: 10_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m1",
    });
    renderScreen("g1");
    await screen.findByText("Sate Padang");

    fireEvent.change(screen.getByRole("textbox", { name: t("group.filter.searchLabel") }), {
      target: { value: "tidak ada yang begini" },
    });

    expect(await screen.findByText(t("group.transaction.filteredEmptyHeading"))).toBeInTheDocument();
    expect(screen.queryByText(t("common.noExpensesYet"))).not.toBeInTheDocument();
  });
});
