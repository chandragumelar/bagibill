import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { setLocale, t } from "@/lib/i18n";
import { AppRouter } from "@/routes/router";
import { ClaimScreen } from "./ClaimScreen";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  setLocale("id");
  window.history.pushState(null, "", "/");
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear()]);
});

async function seed(): Promise<string> {
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
  await adapter.members.put({ memberId: "m1", groupSlug: "g1", name: "Bagus Santoso", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: "g1", name: "Dimas Prasetyo", color: "--m-2", joinedAt: 2_000, seq: 0 });
  const expense = {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Makan Malam Tim",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 87_000,
    payers: [{ memberId: "m1", amountMinor: 87_000 }],
    splitData: { mode: "byItems" as const, memberIds: ["m1", "m2"] },
    charges: [],
    items: [
      { itemId: "i1", name: "Nasi Goreng", unitPriceMinor: 42_000, quantity: 1, claims: [] },
      { itemId: "i2", name: "Ayam Bakar Madu", unitPriceMinor: 45_000, quantity: 1, claims: [{ memberId: "m2", weight: 1 }] },
    ],
    treats: [],
    attachments: [],
    createdBy: "m1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
  };
  await adapter.expenses.put(expense);
  return expense.expenseId;
}

function renderClaim(slug: string, expenseId: string) {
  window.history.pushState(null, "", `/c/${slug}/${expenseId}`);
  return render(<AppRouter routes={[{ path: "/c/:slug/:expenseId", Component: ClaimScreen }]} fallbackPath="/" />);
}

async function pickIdentity(name: string): Promise<void> {
  fireEvent.click(await screen.findByText(name));
}

describe("ClaimScreen — four mockup states", () => {
  it("state 1: pilih identitas, reached by opening a fresh claim link", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);

    expect(await screen.findByText(t("claim.identity.heading"))).toBeInTheDocument();
  });

  it("state 1: shows each participant's name next to their avatar", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));

    const row = screen.getByText("Bagus Santoso").closest("button");
    expect(row?.querySelector('[role="img"]')).toHaveAttribute("aria-label", "Bagus Santoso");
  });

  it("state 2: klaim berjalan, reached after picking an identity", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));

    await pickIdentity("Bagus Santoso");

    expect(await screen.findByText("Nasi Goreng")).toBeInTheDocument();
  });

  it("state 2: shows each claimant's name next to their avatar", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));
    await pickIdentity("Bagus Santoso");
    await screen.findByText("Ayam Bakar Madu");

    const claimantAvatar = screen.getAllByText("Dimas Prasetyo")[0]?.parentElement?.querySelector('[role="img"]');
    expect(claimantAvatar).toHaveAttribute("aria-label", "Dimas Prasetyo");
  });

  it("state 3: tapping an item someone else already fully claims opens a share confirmation instead of taking it over", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));
    await pickIdentity("Bagus Santoso");
    await screen.findByText("Ayam Bakar Madu");

    fireEvent.click(screen.getByText("Ayam Bakar Madu"));

    expect(await screen.findByText(t("claim.confirm.heading"))).toBeInTheDocument();
    expect(screen.getByText(t("claim.confirm.currentlyWith"))).toBeInTheDocument();

    // Confirming, not an unrequested takeover, is what actually adds the second claimant.
    fireEvent.click(screen.getByText(t("claim.confirm.shareButton")));
    await waitFor(() => expect(screen.queryByText(t("claim.confirm.heading"))).not.toBeInTheDocument());
  });

  it("state 3: dismissing the confirmation leaves the original claimant untouched", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));
    await pickIdentity("Bagus Santoso");
    await screen.findByText("Ayam Bakar Madu");

    fireEvent.click(screen.getByText("Ayam Bakar Madu"));
    await screen.findByText(t("claim.confirm.heading"));
    fireEvent.click(screen.getByText(t("claim.confirm.cancelButton")));

    await waitFor(() => expect(screen.queryByText(t("claim.confirm.heading"))).not.toBeInTheDocument());
    expect(screen.getAllByText("Dimas Prasetyo")).toHaveLength(1);
  });

  it("state 4: ringkasan, reached by tapping the sticky total after claiming something", async () => {
    const expenseId = await seed();
    renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));
    await pickIdentity("Bagus Santoso");
    await screen.findByText("Nasi Goreng");

    fireEvent.click(screen.getByText("Nasi Goreng"));
    await waitFor(() => expect(screen.getByText(t("claim.list.itemCount", { count: 1 }))).toBeInTheDocument());
    fireEvent.click(screen.getByText(t("claim.list.itemCount", { count: 1 })));

    expect(await screen.findByText(t("claim.summary.subtitle", { expenseTitle: "Makan Malam Tim" }))).toBeInTheDocument();
    expect(screen.getByText("Nasi Goreng")).toBeInTheDocument();
  });

  it("shows an honest state for a broken link instead of a blank page", async () => {
    renderClaim("no-such-group", "no-such-expense");
    expect(await screen.findByText(t("claim.invalid.heading"))).toBeInTheDocument();
  });
});

const FORBIDDEN_WORDS: Record<"id" | "en", readonly string[]> = {
  id: ["harga", "kunci lisensi", "beli", "berlangganan", "upgrade", "premium", "trial", "paket berbayar"],
  en: ["price", "license key", "buy", "subscribe", "upgrade", "premium", "trial", "paid plan"],
};

// A guest opening a claim link is doing their host a favor, not shopping —
// spec.md's charter forbids any hint of a sale anywhere in this flow. Named
// so it goes red the moment anyone adds a price or upsell here.
describe("ClaimScreen never mentions price, license, or upsells", () => {
  it.each(["id", "en"] as const)("locale %s: none of the four states mention a forbidden word", async (locale) => {
    setLocale(locale);
    const expenseId = await seed();
    const { container } = renderClaim("g1", expenseId);
    await screen.findByText(t("claim.identity.heading"));
    assertNoForbiddenWords(container.textContent ?? "", locale);

    await pickIdentity("Bagus Santoso");
    await screen.findByText("Ayam Bakar Madu");
    assertNoForbiddenWords(container.textContent ?? "", locale);

    fireEvent.click(screen.getByText("Ayam Bakar Madu"));
    await screen.findByText(t("claim.confirm.heading"));
    assertNoForbiddenWords(container.textContent ?? "", locale);
    fireEvent.click(screen.getByText(t("claim.confirm.cancelButton")));

    fireEvent.click(screen.getByText("Nasi Goreng"));
    await waitFor(() => expect(screen.getByText(t("claim.list.itemCount", { count: 1 }))).toBeInTheDocument());
    fireEvent.click(screen.getByText(t("claim.list.itemCount", { count: 1 })));
    await screen.findByText(t("claim.summary.backButton"));
    assertNoForbiddenWords(container.textContent ?? "", locale);
  });
});

function assertNoForbiddenWords(text: string, locale: "id" | "en"): void {
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS[locale]) {
    expect(lower).not.toContain(word);
  }
}
