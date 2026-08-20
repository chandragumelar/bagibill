import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { calculateExpense } from "@bagibill/split-engine";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { expenseRepository } from "@/lib/storage/repositories";
import { toCalculationInput as toEngineCalculationInput } from "@/lib/storage/expense-mapping";
import { t, formatMoney } from "@/lib/i18n";
import { AppRouter } from "@/routes/router";
import { AddExpenseScreen } from "./AddExpenseScreen";

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
    name: "Trip",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.put({
    memberId: "m1",
    groupSlug: "g1",
    name: "Farhan Maulana",
    color: "--m-1",
    joinedAt: 1_000,
    seq: 0,
  });
  await adapter.members.put({
    memberId: "m2",
    groupSlug: "g1",
    name: "Sarah",
    color: "--m-2",
    joinedAt: 2_000,
    seq: 0,
  });
}

async function seedGroupThree(): Promise<void> {
  await seedGroup();
  const adapter = createDexieAdapter(db);
  await adapter.members.put({
    memberId: "m3",
    groupSlug: "g1",
    name: "Andi",
    color: "--m-3",
    joinedAt: 3_000,
    seq: 0,
  });
}

function renderScreen() {
  window.history.pushState(null, "", "/g/g1/add");
  return render(<AppRouter routes={[{ path: "/g/:slug/add", Component: AddExpenseScreen }]} fallbackPath="/app" />);
}

function switchToPorsi(): void {
  fireEvent.click(screen.getByText(t("expense.mode.byWeights")));
}

function typeAmount(rawDigits: string): void {
  fireEvent.change(screen.getByLabelText(t("expense.amount.label")), { target: { value: rawDigits } });
}

// RTL's default text matcher normalizes DOM whitespace (including the
// non-breaking space Intl puts between currency and amount) down to a plain
// space before comparing — so the expected string needs the same treatment,
// or an exact-NBSP query never matches the normalized DOM text.
function renderedMoney(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency).replace(/\u00a0/g, " ");
}

describe("AddExpenseScreen", () => {
  it("renders and shows the result panel in its empty state from the start", async () => {
    await seedGroup();
    renderScreen();
    expect(await screen.findAllByText("Farhan Maulana")).not.toHaveLength(0);
    expect(screen.getByText("Sarah")).toBeInTheDocument();
    expect(screen.getByText(t("expense.result.needAmount"))).toBeInTheDocument();
  });

  it("shows the correct per-person amount as soon as an amount is typed, no calculate button involved", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");
    expect(screen.getAllByText(renderedMoney(5_000, "IDR")).length).toBeGreaterThan(0);
  });

  it("changes the split when a member is unchecked", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");
    fireEvent.click(screen.getByText("Sarah"));
    expect(screen.getAllByText(renderedMoney(10_000, "IDR")).length).toBeGreaterThan(0);
    expect(screen.getByText(t("expense.participants.excluded"))).toBeInTheDocument();
  });

  it("saves one evenly split expense through the screen, and the read-back numbers match the panel", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");
    const shownPerPerson = renderedMoney(5_000, "IDR");
    expect(screen.getAllByText(shownPerPerson).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(t("expense.save.button")));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/g/g1");
    });

    const expenses = await expenseRepository.listExpensesByGroup("g1");
    expect(expenses).toHaveLength(1);
    const stored = expenses[0];
    if (stored === undefined) throw new Error("expected one stored expense");

    expect(stored.amountTotalMinor).toBe(10_000);
    expect(stored.splitData).toEqual({ mode: "evenly", memberIds: ["m1", "m2"] });

    const recalculated = calculateExpense(toEngineCalculationInput(stored));
    expect(recalculated.sharesMinor).toEqual([5_000, 5_000]);
    expect(renderedMoney(recalculated.sharesMinor[0] ?? 0, "IDR")).toBe(shownPerPerson);
  });

  it("shows an inline failure and does not navigate away when the save call fails", async () => {
    await seedGroup();
    vi.spyOn(expenseRepository, "createExpense").mockRejectedValueOnce(new Error("boom"));
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");

    fireEvent.click(screen.getByText(t("expense.save.button")));

    expect(await screen.findByText(t("common.saveFailed"))).toBeInTheDocument();
    expect(window.location.pathname).toBe("/g/g1/add");
  });

  it("switching from Rata to Porsi keeps the amount and the excluded member, no reset", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");
    fireEvent.click(screen.getByText("Sarah"));
    expect(screen.getByText(t("expense.participants.excluded"))).toBeInTheDocument();

    switchToPorsi();

    expect(screen.getAllByText(renderedMoney(10_000, "IDR")).length).toBeGreaterThan(0);
    expect(screen.getByText(t("expense.participants.excluded"))).toBeInTheDocument();
  });

  it("changing a weight updates the result panel in the same render, no calculate button involved", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("9000");
    switchToPorsi();

    fireEvent.click(screen.getByLabelText(t("expense.weight.increase", { name: "Farhan Maulana" })));

    expect(screen.getAllByText(renderedMoney(6_000, "IDR")).length).toBeGreaterThan(0);
  });

  it("saves a byWeights split expense with the entries the repository expects", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("9000");
    switchToPorsi();
    fireEvent.click(screen.getByLabelText(t("expense.weight.increase", { name: "Farhan Maulana" })));

    fireEvent.click(screen.getByText(t("expense.save.button")));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/g/g1");
    });

    const expenses = await expenseRepository.listExpensesByGroup("g1");
    expect(expenses).toHaveLength(1);
    const stored = expenses[0];
    if (stored === undefined) throw new Error("expected one stored expense");

    expect(stored.splitData).toEqual({
      mode: "byWeights",
      entries: [
        { memberId: "m1", weight: 2 },
        { memberId: "m2", weight: 1 },
      ],
    });

    const recalculated = calculateExpense(toEngineCalculationInput(stored));
    expect(recalculated.sharesMinor).toEqual([6_000, 3_000]);
  });

  it("Rata with two charge components and one treat: panel and stored shape both reflect the grand total", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");

    fireEvent.click(screen.getByText(t("expense.charge.loadPreset")));
    fireEvent.click(screen.getByText(t("expense.treat.add")));

    // subtotal 10,000 -> service 5% of subtotal (500) -> PB1 10% of
    // subtotal+service (1,050) -> 11,550 total, all moved onto the sponsor
    // (Farhan Maulana) by the person treat, Sarah left at zero.
    const grandTotal = renderedMoney(11_550, "IDR");
    expect(screen.getAllByText(grandTotal).length).toBeGreaterThan(0);
    expect(screen.getAllByText(renderedMoney(0, "IDR")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sarah").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(t("expense.save.button")));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/g/g1");
    });

    const expenses = await expenseRepository.listExpensesByGroup("g1");
    const stored = expenses[0];
    if (stored === undefined) throw new Error("expected one stored expense");

    expect(stored.amountTotalMinor).toBe(10_000);
    expect(stored.payers).toEqual([{ memberId: "m1", amountMinor: 11_550 }]);
    expect(stored.charges).toEqual([
      { amount: { kind: "percent", percent: 5, basis: "subtotal" }, allocation: { mode: "proportional" } },
      { amount: { kind: "percent", percent: 10, basis: "running_total" }, allocation: { mode: "proportional" } },
    ]);
    expect(stored.treats).toEqual([{ kind: "person", sponsorMemberId: "m1", beneficiaryMemberId: "m2" }]);

    const recalculated = calculateExpense(toEngineCalculationInput(stored));
    expect(recalculated.sharesMinor).toEqual([11_550, 0]);
  });

  it("switching from Rata to Porsi keeps the charges and treats already filled in", async () => {
    await seedGroup();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("10000");

    fireEvent.click(screen.getByText(t("expense.charge.loadPreset")));
    fireEvent.click(screen.getByText(t("expense.treat.add")));
    expect(screen.getAllByLabelText(t("expense.treat.remove"))).toHaveLength(1);

    switchToPorsi();

    expect(screen.getByDisplayValue("Service charge")).toBeInTheDocument();
    expect(screen.getByDisplayValue("PB1")).toBeInTheDocument();
    expect(screen.getAllByLabelText(t("expense.treat.remove"))).toHaveLength(1);
  });

  it("three people at the 1/3 preset split a bill exactly three ways", async () => {
    await seedGroupThree();
    renderScreen();
    await screen.findAllByText("Farhan Maulana");
    typeAmount("9000");
    switchToPorsi();

    for (const name of ["Farhan Maulana", "Sarah", "Andi"]) {
      fireEvent.click(screen.getByLabelText(t("expense.weight.presetThirdAria", { name })));
    }

    expect(screen.getAllByText(renderedMoney(3_000, "IDR")).length).toBeGreaterThanOrEqual(3);
  });
});
