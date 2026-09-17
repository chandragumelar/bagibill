import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { t } from "@/lib/i18n";
import { db } from "@/lib/storage/schema";
import { AppRouter } from "@/routes/router";
import { GroupSettingsScreen } from "./GroupSettingsScreen";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  window.history.pushState(null, "", "/");
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear(), db.activityLog.clear()]);
});

async function seedGroup(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug: "g1",
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.putMany([
    { memberId: "m1", groupSlug: "g1", name: "Andi", color: "--m-1", joinedAt: 1, seq: 0 },
    { memberId: "m2", groupSlug: "g1", name: "Rina", color: "--m-2", joinedAt: 2, seq: 0 },
  ]);
  await adapter.expenses.put({
    expenseId: "e1",
    groupSlug: "g1",
    title: "Makan",
    category: "food",
    date: 1,
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
    createdAt: 1,
    updatedAt: 1,
    seq: 0,
  });
  await adapter.settlements.put({
    settlementId: "s1",
    groupSlug: "g1",
    fromMemberId: "m2",
    toMemberId: "m1",
    amountMinor: 1_000,
    currency: "IDR",
    date: 2,
    createdAt: 2,
    seq: 0,
  });
}

function renderScreen(): void {
  window.history.pushState(null, "", "/g/g1/settings");
  render(<AppRouter routes={[{ path: "/g/:slug/settings", Component: GroupSettingsScreen }]} fallbackPath="/app" />);
}

describe("GroupSettingsScreen", () => {
  it("uses stored transaction, payoff, and outstanding-balance counts in the deletion sheet", async () => {
    await seedGroup();
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: t("group.delete.openButton") }));

    const transactionRow = screen.getByText(t("group.delete.expenseCount", { count: 1 })).closest("li");
    expect(transactionRow).toHaveTextContent(t("group.delete.settlementCount", { count: 1 }));
    expect(screen.getByText(t("group.delete.peopleCount", { count: 2 }))).toBeInTheDocument();
  });
});
