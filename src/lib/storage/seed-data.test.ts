import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { calculateExpense, calculateGroupBalances } from "@bagibill/split-engine";
import type { ExpenseLedger } from "@bagibill/split-engine";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { createSequentialIdGenerator } from "./id";
import { createGroupRepository } from "./group-repository";
import { createMemberRepository } from "./member-repository";
import { createExpenseRepository } from "./expense-repository";
import { createSettlementRepository } from "./settlement-repository";
import { resolveMemberOrder, toCalculationInput } from "./expense-mapping";
import { seedSampleData, type SeedDeps, type SeedSummary } from "./seed-data";
import type { ExpenseRecord, SettlementRecord } from "./records";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear()]);
});

function makeDeps(): SeedDeps {
  const adapter = createDexieAdapter(db);
  const clock = createFixedClock(1_700_000_000_000, 1);
  const idGenerator = createSequentialIdGenerator("seed-");
  return {
    groupRepository: createGroupRepository(adapter, clock, idGenerator),
    memberRepository: createMemberRepository(adapter, clock, idGenerator),
    expenseRepository: createExpenseRepository(adapter, clock, idGenerator),
    settlementRepository: createSettlementRepository(adapter, clock, idGenerator),
    clock,
  };
}

function requireGroup(summary: SeedSummary, name: string): { readonly slug: string; readonly name: string } {
  const group = summary.groups.find((candidate) => candidate.name === name);
  if (group === undefined) {
    throw new Error(`seed-data.test: group "${name}" was not seeded`);
  }
  return group;
}

async function findExpense(deps: SeedDeps, groupSlug: string, title: string): Promise<ExpenseRecord> {
  const expenses = await deps.expenseRepository.listExpensesByGroup(groupSlug);
  const expense = expenses.find((candidate) => candidate.title === title);
  if (expense === undefined) {
    throw new Error(`seed-data.test: expense "${title}" was not seeded`);
  }
  return expense;
}

// Mirrors group-balance.ts's ledger construction (that file lives in
// src/features/settle/ and can't be imported from src/lib/storage/ tests),
// kept to the bare minimum this suite needs: no pendingClaim/broken handling,
// since none of these fixtures are expected to hit those paths.
function buildExpenseLedger(expense: ExpenseRecord, canonicalIds: readonly string[]): ExpenseLedger {
  const input = toCalculationInput(expense);
  const calculation = calculateExpense(input);
  const localOrder = resolveMemberOrder(expense.splitData);
  const localIndexByMemberId = new Map(localOrder.map((memberId, index) => [memberId, index]));
  const atLocalIndex = (values: readonly number[], memberId: string): number => {
    const localIndex = localIndexByMemberId.get(memberId);
    return localIndex === undefined ? 0 : (values[localIndex] ?? 0);
  };
  return {
    sharesMinor: canonicalIds.map((memberId) => atLocalIndex(calculation.sharesMinor, memberId)),
    paymentsMinor: canonicalIds.map((memberId) => atLocalIndex(input.paymentsMinor, memberId)),
  };
}

function buildSettlementLedger(settlement: SettlementRecord, canonicalIds: readonly string[]): ExpenseLedger {
  const fromIndex = canonicalIds.indexOf(settlement.fromMemberId);
  const toIndex = canonicalIds.indexOf(settlement.toMemberId);
  return {
    paymentsMinor: canonicalIds.map((_, index) => (index === fromIndex ? settlement.amountMinor : 0)),
    sharesMinor: canonicalIds.map((_, index) => (index === toIndex ? settlement.amountMinor : 0)),
  };
}

describe("seedSampleData", () => {
  it("creates four groups whose summary matches what's actually stored", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);

    expect(summary.groups.map((group) => group.name)).toEqual([
      "Trip Bromo",
      "Kos Bareng",
      "Nobar Final",
      "Sushi Berempat",
    ]);
    expect(await deps.groupRepository.listGroups()).toHaveLength(4);

    let memberTotal = 0;
    let expenseTotal = 0;
    let settlementTotal = 0;
    for (const group of summary.groups) {
      memberTotal += (await deps.memberRepository.listMembers(group.slug, { includeInactive: true })).length;
      expenseTotal += (await deps.expenseRepository.listExpensesByGroup(group.slug)).length;
      settlementTotal += (await deps.settlementRepository.listSettlementsByGroup(group.slug)).length;
    }
    expect(memberTotal).toBe(summary.memberCount);
    expect(expenseTotal).toBe(summary.expenseCount);
    expect(settlementTotal).toBe(summary.settlementCount);
  });

  it("is additive: seeding twice creates eight groups without throwing", async () => {
    const deps = makeDeps();
    await seedSampleData(deps);
    await expect(seedSampleData(deps)).resolves.toBeDefined();
    expect(await deps.groupRepository.listGroups()).toHaveLength(8);
  });
});

describe("Nasi goreng patungan (Trip Bromo)", () => {
  it("splits into shares that sum exactly to the total, not just three hardcoded numbers", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);
    const tripBromo = requireGroup(summary, "Trip Bromo");
    const expense = await findExpense(deps, tripBromo.slug, "Nasi goreng patungan");

    const calculation = calculateExpense(toCalculationInput(expense));
    expect(calculation.sharesMinor.reduce((sum, share) => sum + share, 0)).toBe(100_000);
    expect(calculation.sharesMinor).toEqual([33_334, 33_333, 33_333]);
  });
});

describe("Tiket masuk kawah (Trip Bromo)", () => {
  it("keeps Rio in the result with a zero share instead of dropping him", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);
    const tripBromo = requireGroup(summary, "Trip Bromo");
    const members = await deps.memberRepository.listMembers(tripBromo.slug, { includeInactive: true });
    const rio = members.find((member) => member.name === "Rio");
    if (rio === undefined) throw new Error("seed-data.test: Rio was not seeded");
    const expense = await findExpense(deps, tripBromo.slug, "Tiket masuk kawah");

    const memberOrder = resolveMemberOrder(expense.splitData);
    const rioIndex = memberOrder.indexOf(rio.memberId);
    const calculation = calculateExpense(toCalculationInput(expense));
    expect(rioIndex).toBeGreaterThanOrEqual(0);
    expect(calculation.sharesMinor[rioIndex]).toBe(0);
  });
});

describe("Beli SIM card (Trip Bromo)", () => {
  it("stores source USD minor units and converts only at calculation boundary", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);
    const tripBromo = requireGroup(summary, "Trip Bromo");
    const expense = await findExpense(deps, tripBromo.slug, "Beli SIM card");
    const input = toCalculationInput(expense, "IDR");
    const calculation = calculateExpense(input);

    expect(expense.currency).toBe("USD");
    expect(expense.amountTotalMinor).toBe(1_000);
    expect(input.totalMinor).toBe(158_000);
    expect(calculation.sharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0)).toBe(158_000);
  });
});

describe("Kopi di Cemoro (Trip Bromo)", () => {
  it("leaves Nadia at zero and moves her share onto Dimas via the person treat", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);
    const tripBromo = requireGroup(summary, "Trip Bromo");
    const members = await deps.memberRepository.listMembers(tripBromo.slug, { includeInactive: true });
    const dimas = members.find((member) => member.name === "Dimas");
    const nadia = members.find((member) => member.name === "Nadia");
    if (dimas === undefined || nadia === undefined) throw new Error("seed-data.test: Dimas/Nadia not seeded");
    const expense = await findExpense(deps, tripBromo.slug, "Kopi di Cemoro");

    const memberOrder = resolveMemberOrder(expense.splitData);
    const calculation = calculateExpense(toCalculationInput(expense));
    expect(calculation.sharesMinor[memberOrder.indexOf(nadia.memberId)]).toBe(0);
    expect(calculation.sharesMinor[memberOrder.indexOf(dimas.memberId)]).toBe(100_000);
  });
});

describe("Kos Bareng settlements", () => {
  it("zeroes every member's net balance, computed through the split-engine facade", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);
    const kosBareng = requireGroup(summary, "Kos Bareng");
    const members = await deps.memberRepository.listMembers(kosBareng.slug, { includeInactive: true });
    const canonicalIds = members.map((member) => member.memberId);
    const expenses = await deps.expenseRepository.listExpensesByGroup(kosBareng.slug);
    const settlements = await deps.settlementRepository.listSettlementsByGroup(kosBareng.slug);

    const ledgers = [
      ...expenses.map((expense) => buildExpenseLedger(expense, canonicalIds)),
      ...settlements.map((settlement) => buildSettlementLedger(settlement, canonicalIds)),
    ];
    const result = calculateGroupBalances({
      participantCount: canonicalIds.length,
      expenses: ledgers,
      settlementMode: "direct",
    });
    expect(result.netMinor.every((netMinor) => netMinor === 0)).toBe(true);
  });
});

describe("Sushi Berempat byItems expense", () => {
  it("stores intact and calculates with an unbalanced_payments warning, not a thrown error", async () => {
    const deps = makeDeps();
    const summary = await seedSampleData(deps);
    const sushiBerempat = requireGroup(summary, "Sushi Berempat");
    const expense = await findExpense(deps, sushiBerempat.slug, "Makan sushi");
    const readBack = await deps.expenseRepository.getExpense(expense.expenseId);
    expect(readBack?.items).toHaveLength(6);

    const calculation = calculateExpense(toCalculationInput(expense));
    expect(calculation.netMinor).toBeNull();
    expect(calculation.warnings.some((warning) => warning.code === "unbalanced_payments")).toBe(true);
  });
});
